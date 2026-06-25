import redis.asyncio as aioredis
from config import REDIS_URL

active_redis_url = REDIS_URL or "redis://localhost:6379/0"

def _make_client():
    if active_redis_url.startswith("rediss://"):
        return aioredis.from_url(
            active_redis_url,
            encoding="utf-8",
            decode_responses=True,
            ssl=True,
            ssl_cert_reqs=None
        )
    return aioredis.from_url(
        active_redis_url,
        encoding="utf-8",
        decode_responses=True
    )

# Main client for get/set/publish
redis_client = _make_client()

async def get_pubsub():
    """Returns a fresh dedicated pubsub connection — call once per WS client."""
    client = _make_client()
    pubsub = client.pubsub()
    pubsub._redis_client = client
    return pubsub

