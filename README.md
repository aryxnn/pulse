# Crypto Order Book — Real-Time Market Data Platform

A full-stack, containerized real-time cryptocurrency order book tracking platform powered by FastAPI, Binance WebSockets, Redis Pub/Sub, PostgreSQL, and React.

---

## 🏗️ Architecture

```
                       +-------------------+
                       | Binance WebSocket |
                       +---------+---------+
                                 | (wss://stream.binance.com)
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
                                 | (ws://localhost:8000)
                                 v
                       +---------+---------+
                       |   React Client    | (Order Book Page)
                       +-------------------+
```

---

## 🚀 Features

- **Real-Time Order Book Engine**: Connects to the Binance L2 depth stream and streams real-time bid and ask arrays to the client with sub-100ms processing latency.
- **Quantitative Metrics Calculation**: Automatically computes key market-microstructure metrics on every packet:
  - **Mid Price**: Mathematical average of best bid and best ask.
  - **Spread**: Instantaneous difference between best ask and best bid.
  - **Bid/Ask Imbalance**: Volume-based supply/demand metric calculated over the top 10 price levels.
  - **Cumulative Volume Delta (CVD) Approximation**: Running sum of the volume differences `(total_bid_vol - total_ask_vol)` to track net buying/selling pressure.
- **Scalable Redis Fan-Out**: Multi-client support using a Redis channel pub/sub architecture. Each active client manages its own subscription loop, avoiding concurrency bottlenecks.
- **Robust Persistence**: Every 60 seconds, a worker aggregates L2 depth data to write an OHLCV snapshot into a PostgreSQL table.
- **Modern Responsive UI**: Real-time visualization tables with color-coded Bids (green) and Asks (red), live metrics dashboard, and queryable historical OHLCV.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | Python 3.11, FastAPI, Uvicorn |
| **Real-time Streaming** | Binance WebSocket, WebSockets library |
| **Pub/Sub Broker** | Redis 7 (Alpine) |
| **Database** | PostgreSQL 15 (Alpine), asyncpg driver |
| **Frontend** | React, React Router, Bootstrap, Material-UI |
| **Infrastructure** | Docker, Docker Compose |

---

## ⚙️ Getting Started

To spin up the entire application environment (Frontend, Backend, Redis, and PostgreSQL) with a single command, run:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API & WebSockets**: http://localhost:8000
