import redis.asyncio as aioredis
from config import REDIS_URL

# Fallback default if REDIS_URL is None
active_redis_url = REDIS_URL or "redis://localhost:6379/0"

if active_redis_url.startswith("rediss://"):
    redis_client = aioredis.from_url(
        active_redis_url,
        encoding="utf-8",
        decode_responses=True,
        ssl=True,
        ssl_cert_reqs=None
    )
else:
    redis_client = aioredis.from_url(
        active_redis_url,
        encoding="utf-8",
        decode_responses=True
    )

async def get_redis_client():
    return redis_client
