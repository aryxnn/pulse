# Pulse Terminal

Pulse Terminal is a full-stack, real-time cryptocurrency trading interface and market data platform. The system streams L2 order book data from Binance WebSockets, processes and aggregates order book parameters, synchronizes state via Redis, and renders a high-performance terminal UI.

## Architecture

```
                       +-------------------+
                       | Binance WebSocket |
                       +---------+---------+
                                 | (wss://stream.binance.us)
                                 v
                       +---------+---------+
                       |  binance_ws.py    |
                       +----+---------+----+
                            |         | (Every 60s)
               (Redis Pub)  |         v
                            |  +------+------+
                            |  | PostgreSQL  |
                            v  +------+------+
                       +----+----+    |
                       |  Redis  |    | (GET /api/ohlcv)
                       | Pub/Sub |    |
                       +----+----+    |
                            |         |
               (Redis Sub)  |         |
                            v         v
                       +----+---------+----+
                       |    FastAPI WS     | (main.py)
                       +---------+---------+
                                 | (WebSocket)
                                 v
                       +---------+---------+
                       |   React Client    | (Pulse UI)
                       +-------------------+
```

---

## Features

* **Real-Time Order Book Engine**: Connects to the Binance L2 depth stream and pushes real-time bid and ask arrays to the client with sub-100ms latency.
* **Microstructure Metrics**: Computes key market-microstructure metrics on every packet:
  * **Mid Price**: Average of best bid and best ask.
  * **Spread**: Difference between best ask and best bid.
  * **CVD (Cumulative Volume Delta)**: Volume differences (bid volume minus ask volume) across the top 20 price levels to track net buying and selling pressure.
* **Redis Integration**: Uses a Redis pub/sub broker to fan out updates to multiple clients.
* **Memory Optimization**: Employs capped local order book state tracking, pruning zero-quantity levels and restricting stored records to the top 20 entries.
* **Pulse UI**: A dark-themed trading desk dashboard with proportional depth bars and instant visual updates.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Streaming** | Binance WebSocket, websockets library |
| **Pub/Sub Broker** | Redis 7 |
| **Database** | PostgreSQL 15, asyncpg |
| **Frontend** | React, Bootstrap |
| **Infrastructure** | Docker, Docker Compose |

---

## Local Development

To run the backend services (FastAPI, Redis, PostgreSQL) locally:

```bash
docker compose up --build
```

Start the React client separately from the project root:

```bash
npm install --legacy-peer-deps
npm start
```

---

## Production Deployment

To keep resource utilization under 512 MB:

1. **Database**: Use a managed serverless PostgreSQL database (e.g., Supabase). Use the Supavisor connection pooler URI as the `DATABASE_URL`.
2. **Redis**: Use a managed Redis instance (e.g., Render Key Value). Set the internal URL as `REDIS_URL`.
3. **Backend**: Host on Render as a Web Service. Set environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
4. **Frontend**: Host on Vercel as a static site. Set environment variables:
   - `REACT_APP_API_BASE` (Backend URL)
   - `REACT_APP_WS_URL` (Backend WebSocket URL)
