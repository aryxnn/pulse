import asyncio
import json
import logging
import time
from datetime import datetime, timezone
import websockets
from backend.redis_client import redis_client
from backend.db import insert_ohlcv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("binance_ws")

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms"
SYMBOL = "BTCUSDT"

async def run_binance_ws():
    # Cumulative CVD tracker
    cvd_running_sum = 0.0
    
    # Lists to aggregate OHLCV data over 60 seconds
    ohlcv_prices = []
    ohlcv_volumes = []
    last_db_write_time = time.time()
    
    logger.info(f"Connecting to Binance WS: {BINANCE_WS_URL}")
    while True:
        try:
            async with websockets.connect(BINANCE_WS_URL) as ws:
                logger.info("Connected to Binance WebSocket.")
                async for message in ws:
                    try:
                        data = json.loads(message)
                        
                        # Parsing bid/ask arrays from the depth snapshot
                        # Binance format: bids: [[price, qty], ...], asks: [[price, qty], ...]
                        bids = [[float(p), float(q)] for p, q in data.get("bids", [])]
                        asks = [[float(p), float(q)] for p, q in data.get("asks", [])]
                        
                        if not bids or not asks:
                            continue
                            
                        best_bid = bids[0][0]
                        best_ask = asks[0][0]
                        
                        # Mid Price & Spread
                        mid_price = (best_bid + best_ask) / 2.0
                        spread = best_ask - best_bid
                        
                        # Top 10 levels for imbalance
                        top_10_bids = bids[:10]
                        top_10_asks = asks[:10]
                        
                        bid_volume_top_10 = sum(level[1] for level in top_10_bids)
                        ask_volume_top_10 = sum(level[1] for level in top_10_asks)
                        
                        total_volume_top_10 = bid_volume_top_10 + ask_volume_top_10
                        if total_volume_top_10 > 0:
                            bid_ask_imbalance = bid_volume_top_10 / total_volume_top_10
                        else:
                            bid_ask_imbalance = 0.5
                            
                        # CVD: running sum of (total_bid_vol - total_ask_vol)
                        cvd_running_sum += (bid_volume_top_10 - ask_volume_top_10)
                        
                        # Record metrics for OHLCV
                        ohlcv_prices.append(mid_price)
                        ohlcv_volumes.append(bid_volume_top_10 + ask_volume_top_10)
                        
                        # Payload preparation
                        timestamp_now = time.time()
                        payload = {
                            "symbol": SYMBOL,
                            "bids": bids[:10],  # UI shows top 10
                            "asks": asks[:10],
                            "metrics": {
                                "mid_price": mid_price,
                                "spread": spread,
                                "bid_ask_imbalance": bid_ask_imbalance,
                                "cvd": cvd_running_sum
                            },
                            "timestamp": timestamp_now
                        }
                        
                        # Publish to Redis pub/sub
                        await redis_client.publish(f"orderbook:{SYMBOL}", json.dumps(payload))
                        
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
                        logger.error(f"Error parsing/processing WS message: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_binance_ws())
