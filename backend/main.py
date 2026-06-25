import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from db import init_db, close_db, get_ohlcv
from binance_ws import run_binance_ws
from redis_client import redis_client, get_pubsub

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

# Required environment variables:
# REDIS_URL — Upstash Redis URL with rediss:// prefix (TLS)
# FRONTEND_URL — Vercel frontend URL (optional, for CORS)

import config

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "https://pulse-frontend.vercel.app",
    "https://pulse-blue-nine.vercel.app",
]
if config.FRONTEND_URL:
    origins.append(config.FRONTEND_URL)

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ohlcv")
async def get_ohlcv_data(symbol: str = "BTCUSDT", limit: int = 100):
    data = await get_ohlcv(symbol, limit)
    return data

@app.get("/orderbook")
async def get_orderbook():
    snapshot = await redis_client.get("orderbook_snapshot")
    if snapshot:
        return json.loads(snapshot)
    return {"symbol": "BTCUSDT", "bids": [], "asks": [], "metrics": {}}

active_connections = 0
MAX_CONNECTIONS = 10

@app.websocket("/ws/orderbook")
async def websocket_orderbook(websocket: WebSocket):
    global active_connections
    if active_connections >= MAX_CONNECTIONS:
        await websocket.close(code=1008)
        return
    active_connections += 1
    config.active_connections = active_connections
    await websocket.accept()
    pubsub = await get_pubsub()
    await pubsub.subscribe("orderbook_updates")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await websocket.send_text(message["data"])
                except Exception:
                    break
    except Exception as e:
        logger.error(f"WS client error: {e}")
    finally:
        active_connections -= 1
        config.active_connections = active_connections
        try:
            await pubsub.unsubscribe("orderbook_updates")
            await pubsub.aclose()
            if hasattr(pubsub, "_redis_client"):
                await pubsub._redis_client.aclose()
        except Exception:
            pass


# Keep the original endpoint for backwards compatibility
@app.websocket("/ws/orderbook/BTCUSDT")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("New WebSocket client connected to /ws/orderbook/BTCUSDT.")
    
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("orderbook:BTCUSDT")
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                payload_str = message["data"]
                try:
                    await websocket.send_text(payload_str)
                except Exception as e:
                    logger.error(f"Error forwarding message to client: {e}")
                    break
            await asyncio.sleep(0.01)  # Cooperatively yield control
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from /ws/orderbook/BTCUSDT.")
    finally:
        await pubsub.unsubscribe("orderbook:BTCUSDT")
        await pubsub.close()
