import React, { useState, useEffect, useRef } from 'react';
import CoinTable from '../components/CoinTable';

const LiveTicker = () => {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/orderbook';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(false);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.metrics) {
            setData(parsed.metrics);
          }
        } catch (e) {
          console.error("Error parsing ticker ws message", e);
        }
      };

      ws.onerror = () => {
        setError(true);
      };

      ws.onclose = () => {
        setConnected(false);
        setError(true);
      };
    } catch (e) {
      console.error("WebSocket initialization failed", e);
      setError(true);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Error boundary logic inside the render
  try {
    if (error) {
      return null;
    }

    const formatVal = (val, decimals = 2) => {
      if (val === undefined || val === null) return '—';
      return Number(val).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    const hasData = data !== null;

    const bid = hasData ? formatVal(data.best_bid, 2) : '—';
    const ask = hasData ? formatVal(data.best_ask, 2) : '—';
    const mid = hasData ? formatVal(data.mid_price, 2) : '—';
    const spread = hasData ? formatVal(data.spread_pct, 4) + '%' : '—';
    const cvdVal = hasData ? data.cvd : null;
    const cvdText = cvdVal !== null ? (cvdVal >= 0 ? '+' : '') + formatVal(cvdVal, 4) : '—';
    const cvdColor = cvdVal !== null ? (cvdVal >= 0 ? '#00ff88' : '#ff4444') : '#ffffff';

    return (
      <div style={{
        width: '100%',
        backgroundColor: '#161b22',
        borderTop: '1px solid #21262d',
        borderBottom: '1px solid #21262d',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        height: '48px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        marginBottom: '24px',
        scrollbarWidth: 'none'
      }}>
        {/* BTC/USDT Label */}
        <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold' }}>
          BTC/USDT
        </span>

        {/* Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: connected ? '#00ff88' : '#ff4444',
            boxShadow: connected ? '0 0 4px #00ff88' : 'none'
          }}></span>
          <span style={{ fontSize: '11px', color: '#8b949e' }}>Live</span>
        </div>

        {/* Separator */}
        <div style={{ borderLeft: '1px solid #21262d', height: '20px' }}></div>

        {/* BID */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', fontWeight: '600' }}>BID</span>
          <span style={{ color: '#00ff88', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold' }}>
            {bid}
          </span>
        </div>

        {/* ASK */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', fontWeight: '600' }}>ASK</span>
          <span style={{ color: '#ff4444', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold' }}>
            {ask}
          </span>
        </div>

        {/* MID */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', fontWeight: '600' }}>MID</span>
          <span style={{ color: '#ffffff', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold' }}>
            {mid}
          </span>
        </div>

        {/* SPREAD */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', fontWeight: '600' }}>SPREAD</span>
          <span style={{ color: '#ffffff', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold' }}>
            {spread}
          </span>
        </div>

        {/* CVD */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8b949e', fontSize: '11px', fontWeight: '600' }}>CVD</span>
          <span style={{ color: cvdColor, fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold' }}>
            {cvdText}
          </span>
        </div>
      </div>
    );
  } catch (e) {
    console.error("LiveTicker render error boundary caught:", e);
    return null;
  }
};

const Home = () => {
  return (
    <div style={{
      backgroundColor: '#0d1117',
      minHeight: '100vh',
      color: '#e6edf3',
      padding: '40px 0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Title block */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#ffffff' }}>
            Crypto Markets
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#8b949e', fontSize: '14px' }}>
            Live prices by market cap
          </p>
        </div>

        {/* Live ticker strip */}
        <LiveTicker />

        {/* Coin Table */}
        <div style={{ width: '100%' }}>
          <CoinTable />
        </div>

      </div>
    </div>
  );
};

export default Home;
