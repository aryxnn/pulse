from pydantic import BaseModel
from typing import List, Tuple

class OrderBookLevel(BaseModel):
    price: float
    quantity: float

class OrderBookMetrics(BaseModel):
    mid_price: float
    spread: float
    bid_ask_imbalance: float
    cvd: float

class OrderBookPayload(BaseModel):
    symbol: str
    bids: List[Tuple[float, float]]
    asks: List[Tuple[float, float]]
    metrics: OrderBookMetrics
    timestamp: float  # Epoch timestamp when the snapshot was processed

class OHLCVResponse(BaseModel):
    id: int
    symbol: str
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float
