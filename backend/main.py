import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db, close_db, get_ohlcv
from backend.binance_ws import run_binance_ws
from backend.redis_client import redis_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Init Database pool
    await init_db()
    
    # Start Binance WS as background task
    bg_task = asyncio.create_task(run_binance_ws())
    logger.info("Binance WS worker started in background.")
    
    yield
    
    # Shutdown: Clean up resources
    bg_task.cancel()
    try:
        await bg_task
    except asyncio.CancelledError:
        logger.info("Binance WS worker stopped.")
    
    await close_db()

app = FastAPI(lifespan=lifespan)

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ohlcv")
async def get_ohlcv_data(symbol: str = "BTCUSDT", limit: int = 100):
    data = await get_ohlcv(symbol, limit)
    return data

@app.websocket("/ws/orderbook/BTCUSDT")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("New WebSocket client connected.")
    
    # Each WebSocket client connection must create its own Redis pubsub subscription
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("orderbook:BTCUSDT")
    
    try:
        while True:
            # We listen to pubsub messages asynchronously
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                payload_str = message["data"]
                try:
                    payload = json.loads(payload_str)
                    
                    # Latency tracking: timestamp is epoch seconds from binance_ws.py
                    sent_time = payload.get("timestamp", 0)
                    if sent_time > 0:
                        now = time.time()
                        latency_ms = (now - sent_time) * 1000.0
                        logger.info(f"[Latency] Round-trip latency to client forward: {latency_ms:.2f} ms")
                        
                    await websocket.send_text(payload_str)
                except Exception as e:
                    logger.error(f"Error forwarding message to client: {e}")
                    break
            await asyncio.sleep(0.01)  # Cooperatively yield control
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    finally:
        await pubsub.unsubscribe("orderbook:BTCUSDT")
        await pubsub.close()
