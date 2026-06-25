import os
import logging
import asyncpg
from typing import List, Dict, Any

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cryptodb")

logger = logging.getLogger("db")
pool = None

async def init_db():
    global pool
    logger.info("Initializing database pool...")
    pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=2)
    
    # Create the ohlcv table if it does not exist
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ohlcv (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                open NUMERIC NOT NULL,
                high NUMERIC NOT NULL,
                low NUMERIC NOT NULL,
                close NUMERIC NOT NULL,
                volume NUMERIC NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timestamp ON ohlcv (symbol, timestamp DESC);
        """)
        logger.info("Database schema initialized.")

async def close_db():
    global pool
    if pool:
        await pool.close()
        logger.info("Database pool closed.")

async def insert_ohlcv(symbol: str, timestamp, open_px: float, high: float, low: float, close: float, volume: float):
    global pool
    if not pool:
        raise RuntimeError("Database pool is not initialized")
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ohlcv (symbol, timestamp, open, high, low, close, volume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            symbol, timestamp, open_px, high, low, close, volume
        )

async def get_ohlcv(symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
    global pool
    if not pool:
        raise RuntimeError("Database pool is not initialized")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, symbol, timestamp, open, high, low, close, volume
            FROM ohlcv
            WHERE symbol = $1
            ORDER BY timestamp DESC
            LIMIT $2
            """,
            symbol, limit
        )
        return [
            {
                "id": r["id"],
                "symbol": r["symbol"],
                "timestamp": r["timestamp"].isoformat(),
                "open": float(r["open"]),
                "high": float(r["high"]),
                "low": float(r["low"]),
                "close": float(r["close"]),
                "volume": float(r["volume"])
            }
            for r in rows
        ]
