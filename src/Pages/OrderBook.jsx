import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/orderbook';

const OrderBook = () => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [metrics, setMetrics] = useState({
    mid_price: 0,
    spread_abs: 0,
    spread_pct: 0,
    cvd: 0,
    best_bid: 0,
    best_ask: 0,
  });
  
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Animation/Flash states for row updates
  const [bidFlashes, setBidFlashes] = useState({});
  const [askFlashes, setAskFlashes] = useState({});

  const prevBidsRef = useRef([]);
  const prevAsksRef = useRef([]);
  const wsRef = useRef(null);

  // Fetch initial snapshot
  const fetchSnapshot = async () => {
    try {
      const response = await axios.get(`${API_BASE}/orderbook`);
      const data = response.data;
      if (data) {
        setBids(data.bids || []);
        setAsks(data.asks || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        if (data.timestamp) {
          setLastUpdated(new Date(data.timestamp * 1000));
        }
        prevBidsRef.current = data.bids || [];
        prevAsksRef.current = data.asks || [];
      }
    } catch (error) {
      console.error('Error fetching orderbook snapshot:', error);
    }
  };

  useEffect(() => {
    fetchSnapshot();

    const connectWs = () => {
      setWsStatus('Connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const nextBids = data.bids || [];
          const nextAsks = data.asks || [];

          // Detect increases in bids (at same price levels)
          setBidFlashes((current) => {
            const next = { ...current };
            let updated = false;
            nextBids.slice(0, 15).forEach((bid) => {
              const price = bid[0];
              const qty = bid[1];
              const prevMatch = prevBidsRef.current.find(b => b[0] === price);
              if (prevMatch && qty > prevMatch[1]) {
                next[price] = Date.now();
                updated = true;
              }
            });
            return updated ? next : current;
          });

          // Detect increases in asks
          setAskFlashes((current) => {
            const next = { ...current };
            let updated = false;
            nextAsks.slice(0, 15).forEach((ask) => {
              const price = ask[0];
              const qty = ask[1];
              const prevMatch = prevAsksRef.current.find(a => a[0] === price);
              if (prevMatch && qty > prevMatch[1]) {
                next[price] = Date.now();
                updated = true;
              }
            });
            return updated ? next : current;
          });

          prevBidsRef.current = nextBids;
          prevAsksRef.current = nextAsks;

          setBids(nextBids);
          setAsks(nextAsks);

          if (data.metrics) {
            setMetrics(data.metrics);
          }
          if (data.timestamp) {
            setLastUpdated(new Date(data.timestamp * 1000));
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        setWsStatus('Reconnecting...');
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Prepare top 15 levels for bids and asks
  const visibleBids = bids.slice(0, 15);
  const visibleAsks = asks.slice(0, 15);

  // Compute cumulative values for rendering totals
  const getCumulativeData = (levels) => {
    let total = 0;
    return levels.map(([price, qty]) => {
      total += qty;
      return { price, qty, total };
    });
  };

  const cumulativeBids = getCumulativeData(visibleBids);
  const cumulativeAsks = getCumulativeData(visibleAsks);

  const maxBidSize = visibleBids.length > 0 ? Math.max(...visibleBids.map(b => b[1])) : 1;
  const maxAskSize = visibleAsks.length > 0 ? Math.max(...visibleAsks.map(a => a[1])) : 1;

  const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null) return '-';
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatTimestamp = (date) => {
    if (!date) return 'Never';
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  // Get status color for status dot
  const getStatusColor = () => {
    if (wsStatus === 'Connected') return '#00ff88';
    return '#ff4444';
  };

  return (
    <div style={{
      backgroundColor: '#0d1117',
      minHeight: '100vh',
      width: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e6edf3',
      padding: '24px 0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* CSS Styles */}
        <style>{`
          @keyframes flashGreen {
            0% { background-color: rgba(0, 255, 136, 0.25); }
            100% { background-color: transparent; }
          }
          @keyframes flashRed {
            0% { background-color: rgba(255, 68, 68, 0.25); }
            100% { background-color: transparent; }
          }
          .flash-bid {
            animation: flashGreen 300ms ease-out forwards;
          }
          .flash-ask {
            animation: flashRed 300ms ease-out forwards;
          }
          .grid-row-header {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            padding: 8px 20px;
            font-size: 11px;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #21262d;
            font-weight: 600;
          }
          .grid-row-data {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            padding: 6px 20px;
            font-size: 13px;
            font-family: 'Courier New', Courier, monospace;
            position: relative;
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
          .grid-row-data:hover {
            background-color: #1c2128 !important;
          }
          .grid-cell {
            position: relative;
            z-index: 1;
          }
          .text-mono {
            font-family: 'Courier New', Courier, monospace;
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '20px',
          borderBottom: '1px solid #21262d',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-0.02em' }}>
              BTC/USDT
            </h1>
            <div style={{ display: 'flex', align_items: 'center', gap: '8px', marginTop: '4px', fontSize: '14px', color: '#8b949e' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
                boxShadow: `0 0 6px ${getStatusColor()}`,
                alignSelf: 'center'
              }}></span>
              <span>{wsStatus}</span>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#8b949e', fontFamily: "'Courier New', monospace" }}>
            {formatTimestamp(lastUpdated)}
          </div>
        </div>

        {/* Metrics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Mid Price Card */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderLeft: '4px solid #ffd700',
            borderRadius: '8px',
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '8px' }}>
              MID PRICE
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', fontFamily: "'Courier New', monospace" }}>
              ${formatNumber(metrics.mid_price, 2)}
            </div>
          </div>

          {/* Spread Card */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '8px',
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '8px' }}>
              SPREAD
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', fontFamily: "'Courier New', monospace" }}>
              ${formatNumber(metrics.spread_abs, 2)}
            </div>
          </div>

          {/* Spread % Card */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '8px',
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '8px' }}>
              SPREAD %
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', fontFamily: "'Courier New', monospace" }}>
              {formatNumber(metrics.spread_pct, 4)}%
            </div>
          </div>

          {/* CVD Card */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '8px',
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '8px' }}>
              CVD
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: "'Courier New', monospace",
              color: metrics.cvd >= 0 ? '#00ff88' : '#ff4444'
            }}>
              {metrics.cvd >= 0 ? '+' : ''}{formatNumber(metrics.cvd, 4)}
            </div>
          </div>
        </div>

        {/* Order Book side-by-side columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {/* Bids Column */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #21262d',
              color: '#00ff88',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              Bids
            </div>
            <div>
              <div className="grid-row-header">
                <div style={{ textAlign: 'left' }}>Price (USDT)</div>
                <div style={{ textAlign: 'right' }}>Size (BTC)</div>
                <div style={{ textAlign: 'right' }}>Total (BTC)</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {cumulativeBids.map((bid) => {
                  const barWidth = maxBidSize > 0 ? (bid.qty / maxBidSize) * 100 : 0;
                  const flashKey = bidFlashes[bid.price] || '';
                  return (
                    <div
                      key={`bid-${bid.price}-${flashKey}`}
                      className={`grid-row-data ${flashKey ? 'flash-bid' : ''}`}
                    >
                      {/* Depth Bar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: `${barWidth}%`,
                        backgroundColor: 'rgba(0, 255, 136, 0.08)',
                        zIndex: 0,
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div className="grid-cell" style={{ textAlign: 'left', color: '#00ff88', fontWeight: 'bold' }}>
                        {formatNumber(bid.price, 2)}
                      </div>
                      <div className="grid-cell" style={{ textAlign: 'right', color: '#ffffff' }}>
                        {formatNumber(bid.qty, 4)}
                      </div>
                      <div className="grid-cell" style={{ textAlign: 'right', color: '#8b949e' }}>
                        {formatNumber(bid.total, 4)}
                      </div>
                    </div>
                  );
                })}
                {cumulativeBids.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e', fontSize: '14px' }}>
                    No active bid data
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Asks Column */}
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #21262d',
              color: '#ff4444',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              Asks
            </div>
            <div>
              <div className="grid-row-header">
                <div style={{ textAlign: 'left' }}>Price (USDT)</div>
                <div style={{ textAlign: 'right' }}>Size (BTC)</div>
                <div style={{ textAlign: 'right' }}>Total (BTC)</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {cumulativeAsks.map((ask) => {
                  const barWidth = maxAskSize > 0 ? (ask.qty / maxAskSize) * 100 : 0;
                  const flashKey = askFlashes[ask.price] || '';
                  return (
                    <div
                      key={`ask-${ask.price}-${flashKey}`}
                      className={`grid-row-data ${flashKey ? 'flash-ask' : ''}`}
                    >
                      {/* Depth Bar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${barWidth}%`,
                        backgroundColor: 'rgba(255, 68, 68, 0.08)',
                        zIndex: 0,
                        pointerEvents: 'none'
                      }}></div>
                      
                      <div className="grid-cell" style={{ textAlign: 'left', color: '#ff4444', fontWeight: 'bold' }}>
                        {formatNumber(ask.price, 2)}
                      </div>
                      <div className="grid-cell" style={{ textAlign: 'right', color: '#ffffff' }}>
                        {formatNumber(ask.qty, 4)}
                      </div>
                      <div className="grid-cell" style={{ textAlign: 'right', color: '#8b949e' }}>
                        {formatNumber(ask.total, 4)}
                      </div>
                    </div>
                  );
                })}
                {cumulativeAsks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e', fontSize: '14px' }}>
                    No active ask data
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderBook;
