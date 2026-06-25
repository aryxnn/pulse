import os

REDIS_URL = os.getenv("REDIS_URL", None)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
active_connections = 0
