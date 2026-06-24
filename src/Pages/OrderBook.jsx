import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/orderbook/BTCUSDT';

const OrderBook = () => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  
  // Metrics & State History
  const [metrics, setMetrics] = useState({
    mid_price: 0,
    spread: 0,
    bid_ask_imbalance: 0.5,
    cvd: 0,
  });
  
  const [cvdHistory, setCvdHistory] = useState([]);
  const [ohlcv, setOhlcv] = useState([]);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  
  // Animation/Flash states for metric cards
  const [midPriceDirection, setMidPriceDirection] = useState(null); // 'up', 'down', or null
  const [cardFlashes, setCardFlashes] = useState({
    mid_price: '',
    spread: '',
    bid_ask_imbalance: '',
    cvd: '',
  });

  // Track previous values to compare changes
  const prevMetricsRef = useRef({ mid_price: 0, spread: 0, bid_ask_imbalance: 0.5, cvd: 0 });
  const prevBidsRef = useRef([]);
  const prevAsksRef = useRef([]);
  
  // Track timestamps of changes for row flashes
  const [bidFlashes, setBidFlashes] = useState(Array(10).fill(false));
  const [askFlashes, setAskFlashes] = useState(Array(10).fill(false));

  const wsRef = useRef(null);

  const fetchOhlcv = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/ohlcv?symbol=BTCUSDT&limit=10`);
      setOhlcv(response.data);
    } catch (error) {
      console.error('Error fetching OHLCV data:', error);
    }
  };

  useEffect(() => {
    fetchOhlcv();

    const connectWs = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setWsStatus('Connecting');

      ws.onopen = () => {
        setWsStatus('Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Row Flashes comparison
          const nextBids = data.bids || [];
          const nextAsks = data.asks || [];
          const newBidFlashes = [...bidFlashes];
          const newAskFlashes = [...askFlashes];

          nextBids.forEach((bid, idx) => {
            const prev = prevBidsRef.current[idx];
            if (!prev || prev[0] !== bid[0] || prev[1] !== bid[1]) {
              newBidFlashes[idx] = true;
              setTimeout(() => {
                setBidFlashes(current => {
                  const updated = [...current];
                  updated[idx] = false;
                  return updated;
                });
              }, 150);
            }
          });

          nextAsks.forEach((ask, idx) => {
            const prev = prevAsksRef.current[idx];
            if (!prev || prev[0] !== ask[0] || prev[1] !== ask[1]) {
              newAskFlashes[idx] = true;
              setTimeout(() => {
                setAskFlashes(current => {
                  const updated = [...current];
                  updated[idx] = false;
                  return updated;
                });
              }, 150);
            }
          });

          prevBidsRef.current = nextBids;
          prevAsksRef.current = nextAsks;
          setBidFlashes(newBidFlashes);
          setAskFlashes(newAskFlashes);

          // Update Bids/Asks
          setBids(nextBids);
          setAsks(nextAsks);

          // Metrics comparison
          if (data.metrics) {
            const prev = prevMetricsRef.current;
            const current = data.metrics;
            
            const nextFlashes = { mid_price: '', spread: '', bid_ask_imbalance: '', cvd: '' };
            
            // Mid price direction & flash
            if (current.mid_price > prev.mid_price) {
              setMidPriceDirection('up');
              nextFlashes.mid_price = 'flash-green';
            } else if (current.mid_price < prev.mid_price) {
              setMidPriceDirection('down');
              nextFlashes.mid_price = 'flash-red';
            }
            
            // Spread flash
            if (current.spread > prev.spread) nextFlashes.spread = 'flash-red';
            else if (current.spread < prev.spread) nextFlashes.spread = 'flash-green';
            
            // Imbalance flash
            if (current.bid_ask_imbalance > prev.bid_ask_imbalance) nextFlashes.bid_ask_imbalance = 'flash-green';
            else if (current.bid_ask_imbalance < prev.bid_ask_imbalance) nextFlashes.bid_ask_imbalance = 'flash-red';

            // CVD flash & Sparkline history
            if (current.cvd > prev.cvd) nextFlashes.cvd = 'flash-green';
            else if (current.cvd < prev.cvd) nextFlashes.cvd = 'flash-red';

            setMetrics(current);
            setCardFlashes(nextFlashes);
            
            // Reset flash styling after 300ms
            setTimeout(() => {
              setCardFlashes({ mid_price: '', spread: '', bid_ask_imbalance: '', cvd: '' });
            }, 300);

            // Record CVD history
            setCvdHistory(prevHistory => {
              const updated = [...prevHistory, current.cvd];
              if (updated.length > 30) updated.shift();
              return updated;
            });

            prevMetricsRef.current = current;
          }

        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        setWsStatus('Disconnected');
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();
    const interval = setInterval(fetchOhlcv, 30000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
    };
  }, []);

  // Compute depth values and maximum visible volume for percentage mapping
  const getCumulativeData = (levels) => {
    let total = 0;
    return levels.map(([price, qty]) => {
      total += qty;
      return { price, qty, total };
    });
  };

  const cumulativeBids = getCumulativeData(bids);
  const cumulativeAsks = getCumulativeData(asks);

  const maxBidVolume = bids.length > 0 ? Math.max(...bids.map(b => b[1])) : 1;
  const maxAskVolume = asks.length > 0 ? Math.max(...asks.map(a => a[1])) : 1;
  const maxOverallVolume = Math.max(maxBidVolume, maxAskVolume);

  // Render SVG Sparkline
  const renderSparkline = (data) => {
    if (data.length < 2) return null;
    const width = 120;
    const height = 30;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const valRange = maxVal - minVal || 1;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - minVal) / valRange) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="ms-2">
        <polyline
          fill="none"
          stroke={data[data.length - 1] >= data[0] ? '#198754' : '#dc3545'}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  // Render inline Candlestick SVG (20x30px)
  const renderCandlestick = (row) => {
    const { open, high, low, close } = row;
    const maxVal = high;
    const minVal = low;
    const range = maxVal - minVal || 1;

    const yHigh = (30 * (maxVal - high)) / range;
    const yLow = (30 * (maxVal - low)) / range;
    const yOpen = (30 * (maxVal - open)) / range;
    const yClose = (30 * (maxVal - close)) / range;

    const bodyY = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1.5);
    const isBullish = close >= open;
    const color = isBullish ? '#198754' : '#dc3545';

    return (
      <svg width="20" height="30" style={{ display: 'block', margin: 'auto' }}>
        {/* Wick line */}
        <line x1="10" y1={yHigh} x2="10" y2={yLow} stroke={color} strokeWidth="1.5" />
        {/* Real body */}
        <rect x="4" y={bodyY} width="12" height={bodyHeight} fill={color} />
      </svg>
    );
  };

  return (
    <div className="container-fluid px-4 py-4 text-white" style={{ minHeight: '100vh', backgroundColor: '#0b0c0e' }}>
      
      {/* CSS Styles injection */}
      <style>{`
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 0 rgba(25, 135, 84, 0.4);
          animation: pulse 1.5s infinite;
        }
        .pulse-dot.green {
          background-color: #198754;
          box-shadow: 0 0 0 #198754;
        }
        .pulse-dot.red {
          background-color: #dc3545;
          animation: pulse-red 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(25, 135, 84, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
        }
        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .metric-card {
          transition: background-color 0.3s ease, border-color 0.3s ease;
          background-color: #121418 !important;
          border: 1px solid #2d3139 !important;
        }
        .flash-green {
          background-color: rgba(25, 135, 84, 0.15) !important;
          border-color: #198754 !important;
        }
        .flash-red {
          background-color: rgba(220, 53, 69, 0.15) !important;
          border-color: #dc3545 !important;
        }
        .flash-row-change {
          background-color: rgba(255, 193, 7, 0.15) !important;
          transition: background-color 0s;
        }
        .orderbook-row {
          position: relative;
          transition: background-color 0.5s ease;
        }
        .orderbook-row td {
          position: relative;
          z-index: 2;
          background: transparent !important;
        }
        .depth-bar {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 1;
          pointer-events: none;
          transition: width 0.2s ease;
        }
        .depth-bar.bid-bar {
          right: 0;
          background-color: rgba(0, 255, 0, 0.08);
        }
        .depth-bar.ask-bar {
          left: 0;
          background-color: rgba(255, 0, 0, 0.08);
        }
      `}</style>

      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary">
        <div>
          <h1 className="fw-bold mb-0 text-info" style={{ letterSpacing: '-0.5px' }}>Real-Time Order Book</h1>
          <p className="text-muted mb-0 small">
            BTC/USDT · Binance L2 · 100ms feed · Redis pub/sub · PostgreSQL OHLCV
          </p>
        </div>
        <div className="d-flex align-items-center bg-dark px-3 py-2 rounded border border-secondary shadow-sm">
          <span className={`pulse-dot ${wsStatus === 'Connected' ? 'green' : 'red'}`} />
          <span className="fw-bold text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
            {wsStatus === 'Connected' ? 'LIVE' : 'RECONNECTING...'}
          </span>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="row g-4 mb-4">
        {/* Left panel (40%): Bids Table */}
        <div className="col-lg-5">
          <div className="card h-100 p-3 shadow-sm" style={{ backgroundColor: '#121418', border: '1px solid #2d3139' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-success fw-bold mb-0">Bids (Buy Orders)</h5>
              <span className="text-muted small">Top 10 Levels</span>
            </div>
            <div className="table-responsive">
              <table className="table table-dark table-sm text-end mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr className="text-muted border-secondary">
                    <th scope="col" className="text-start">Cumulative</th>
                    <th scope="col">Amount (BTC)</th>
                    <th scope="col" className="text-success">Price (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeBids.map((bid, idx) => {
                    const depthPercent = (bid.qty / maxOverallVolume) * 100;
                    return (
                      <tr key={idx} className={`orderbook-row ${bidFlashes[idx] ? 'flash-row-change' : ''}`}>
                        {/* Depth background bar */}
                        <div className="depth-bar bid-bar" style={{ width: `${depthPercent}%` }} />
                        <td className="text-start text-muted">{bid.total.toFixed(4)}</td>
                        <td>{bid.qty.toFixed(4)}</td>
                        <td className="text-success fw-bold">${bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  {cumulativeBids.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-4">Waiting for bids feed...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Center panel (20%): Metrics Strip */}
        <div className="col-lg-2">
          <div className="d-flex flex-column gap-3 h-100">
            {/* Mid Price Card */}
            <div className={`card metric-card p-3 flex-fill ${cardFlashes.mid_price}`}>
              <span className="text-muted small uppercase fw-semibold">Mid Price</span>
              <div className="d-flex align-items-center mt-2 justify-content-between">
                <span className="text-warning fw-bold fs-5">
                  ${metrics.mid_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {midPriceDirection && (
                  <span className={`fw-bold ms-2 ${midPriceDirection === 'up' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.2rem' }}>
                    {midPriceDirection === 'up' ? '▲' : '▼'}
                  </span>
                )}
              </div>
            </div>

            {/* Market Pressure Indicator (replacing progress bar) */}
            <div className={`card metric-card p-3 flex-fill ${cardFlashes.bid_ask_imbalance}`}>
              <span className="text-muted small uppercase fw-semibold">Market Pressure</span>
              <div className="d-flex justify-content-between mt-2 mb-1" style={{ fontSize: '0.8rem' }}>
                <span className="text-success fw-bold">{(metrics.bid_ask_imbalance * 100).toFixed(0)}% Bids</span>
                <span className="text-danger fw-bold">{((1 - metrics.bid_ask_imbalance) * 100).toFixed(0)}% Asks</span>
              </div>
              <div className="w-100 rounded overflow-hidden d-flex" style={{ height: '8px', backgroundColor: '#333' }}>
                <div className="bg-success" style={{ width: `${metrics.bid_ask_imbalance * 100}%`, transition: 'width 0.3s ease' }} />
                <div className="bg-danger" style={{ width: `${(1 - metrics.bid_ask_imbalance) * 100}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Spread Card */}
            <div className={`card metric-card p-3 flex-fill ${cardFlashes.spread}`}>
              <span className="text-muted small uppercase fw-semibold">Spread</span>
              <div className="mt-2 text-info fw-bold fs-5">
                ${metrics.spread.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* CVD Card with Inline Sparkline */}
            <div className={`card metric-card p-3 flex-fill ${cardFlashes.cvd}`}>
              <span className="text-muted small uppercase fw-semibold">CVD Delta Approx</span>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <span className={`fw-bold ${metrics.cvd >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.05rem' }}>
                  {metrics.cvd.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="mt-2 d-flex justify-content-center border-top border-secondary pt-2" style={{ height: '30px' }}>
                {renderSparkline(cvdHistory)}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel (40%): Asks Table */}
        <div className="col-lg-5">
          <div className="card h-100 p-3 shadow-sm" style={{ backgroundColor: '#121418', border: '1px solid #2d3139' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-danger fw-bold mb-0">Asks (Sell Orders)</h5>
              <span className="text-muted small">Top 10 Levels</span>
            </div>
            <div className="table-responsive">
              <table className="table table-dark table-sm text-start mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr className="text-muted border-secondary">
                    <th scope="col" className="text-danger">Price (USD)</th>
                    <th scope="col" className="text-end">Amount (BTC)</th>
                    <th scope="col" className="text-end text-muted">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeAsks.map((ask, idx) => {
                    const depthPercent = (ask.qty / maxOverallVolume) * 100;
                    return (
                      <tr key={idx} className={`orderbook-row ${askFlashes[idx] ? 'flash-row-change' : ''}`}>
                        {/* Depth background bar */}
                        <div className="depth-bar ask-bar" style={{ width: `${depthPercent}%` }} />
                        <td className="text-danger fw-bold">${ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="text-end">{ask.qty.toFixed(4)}</td>
                        <td className="text-end text-muted">{ask.total.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                  {cumulativeAsks.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-4">Waiting for asks feed...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: OHLCV Snapshots with Candlesticks */}
      <div className="row">
        <div className="col-12">
          <div className="card p-3 shadow-sm" style={{ backgroundColor: '#121418', border: '1px solid #2d3139' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="text-info fw-bold mb-0">OHLCV 60s Snapshots</h5>
                <span className="text-muted small">Aggregated levels stored in database</span>
              </div>
              <button className="btn btn-outline-info btn-sm" onClick={fetchOhlcv}>Refresh</button>
            </div>
            <div className="table-responsive">
              <table className="table table-dark table-hover table-sm text-center mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr className="text-muted border-secondary">
                    <th>Time</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {ohlcv.map((row) => {
                    const date = new Date(row.timestamp);
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <tr key={row.id} className="align-middle">
                        <td className="text-muted">{timeStr}</td>
                        <td>${row.open.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td className="text-success">${row.high.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td className="text-danger">${row.low.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td>${row.close.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td>{row.volume.toFixed(2)}</td>
                        <td>{renderCandlestick(row)}</td>
                      </tr>
                    );
                  })}
                  {ohlcv.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">No snapshots registered in PostgreSQL yet. Aggregation commits every 60s.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default OrderBook;
