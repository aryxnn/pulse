import asyncio
import json
import logging
import time
from datetime import datetime, timezone
import websockets
from backend.redis_client import redis_client
from backend.db import insert_ohlcv

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("binance_ws")

BINANCE_WS_URL = "wss://stream.binance.us:9443/ws/btcusdt@depth20@100ms"
SYMBOL = "BTCUSDT"

async def run_binance_ws():
    # Keep OHLCV aggregations across reconnects
    ohlcv_prices = []
    ohlcv_volumes = []
    last_db_write_time = time.time()

    retry_count = 0
    base_delay = 1.0
    max_delay = 30.0

    while True:
        try:
            logger.info(f"Connecting to Binance WS: {BINANCE_WS_URL} (Attempt {retry_count + 1})")
            async with websockets.connect(BINANCE_WS_URL) as ws:
                logger.info("Connected to Binance WS.")
                retry_count = 0  # reset retries on successful connection

                async for message in ws:
                    try:
                        data = json.loads(message)
                        
                        # Parse and sort bids (descending) and asks (ascending)
                        raw_bids = data.get("bids", [])
                        raw_asks = data.get("asks", [])
                        
                        bids = sorted([[float(p), float(q)] for p, q in raw_bids], key=lambda x: x[0], reverse=True)
                        asks = sorted([[float(p), float(q)] for p, q in raw_asks], key=lambda x: x[0])
                        
                        if not bids or not asks:
                            continue
                            
                        best_bid = bids[0][0]
                        best_ask = asks[0][0]
                        
                        # Compute metrics
                        mid_price = (best_bid + best_ask) / 2.0
                        spread_abs = best_ask - best_bid
                        spread_pct = (spread_abs / mid_price) * 100.0 if mid_price > 0 else 0.0
                        
                        # CVD: sum bid_vol - ask_vol across top 20
                        top_20_bids = bids[:20]
                        top_20_asks = asks[:20]
                        
                        bid_vol_sum = sum(level[1] for level in top_20_bids)
                        ask_vol_sum = sum(level[1] for level in top_20_asks)
                        cvd = bid_vol_sum - ask_vol_sum
                        
                        # Record metrics for OHLCV database insertion
                        ohlcv_prices.append(mid_price)
                        ohlcv_volumes.append(bid_vol_sum + ask_vol_sum)
                        
                        # Payload preparation
                        timestamp_now = time.time()
                        payload = {
                            "symbol": SYMBOL,
                            "bids": bids,
                            "asks": asks,
                            "metrics": {
                                "mid_price": mid_price,
                                "spread_abs": spread_abs,
                                "spread_pct": spread_pct,
                                "cvd": cvd,
                                "best_bid": best_bid,
                                "best_ask": best_ask
                            },
                            "timestamp": timestamp_now
                        }
                        
                        payload_str = json.dumps(payload)
                        
                        # Save full payload as JSON to Redis key: orderbook_snapshot
                        await redis_client.set("orderbook_snapshot", payload_str)
                        
                        # Publish same payload to Redis channel: orderbook_updates
                        await redis_client.publish("orderbook_updates", payload_str)
                        
                        # Check if 60 seconds have elapsed to write to Postgres
                        if timestamp_now - last_db_write_time >= 60.0:
                            if ohlcv_prices:
                                open_px = ohlcv_prices[0]
                                high_px = max(ohlcv_prices)
                                low_px = min(ohlcv_prices)
                                close_px = ohlcv_prices[-1]
                                avg_volume = sum(ohlcv_volumes) / len(ohlcv_volumes)
                                
                                db_timestamp = datetime.now(timezone.utc)
                                try:
                                    await insert_ohlcv(SYMBOL, db_timestamp, open_px, high_px, low_px, close_px, avg_volume)
                                    logger.info(f"Inserted OHLCV: Open={open_px:.2f}, High={high_px:.2f}, Low={low_px:.2f}, Close={close_px:.2f}, Vol={avg_volume:.2f}")
                                except Exception as e:
                                    logger.error(f"Error inserting OHLCV to DB: {e}")
                                    
                            # Reset aggregation buffers
                            ohlcv_prices.clear()
                            ohlcv_volumes.clear()
                            last_db_write_time = timestamp_now
                            
                    except Exception as e:
                        logger.error(f"Error processing WS message: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            retry_count += 1
            if retry_count > 5:
                logger.error("Max retries (5) reached. Continuing attempt after delay.")
                retry_count = 5  # Cap the retry_count for delay calculation
            
            delay = min(base_delay * (2 ** (retry_count - 1)), max_delay)
            logger.info(f"Reconnecting in {delay:.1f} seconds...")
            await asyncio.sleep(delay)

if __name__ == "__main__":
    asyncio.run(run_binance_ws())
