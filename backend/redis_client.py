import os
import redis.asyncio as aioredis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Async Redis client instance
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)

async def get_redis_client():
    return redis_client
