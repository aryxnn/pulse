import React, { useState, useEffect } from "react";
import axios from "axios";

const Portfolio = () => {
  const [holdings, setHoldings] = useState([]);
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    axios.get("https://api.coingecko.com/api/v3/coins/markets", {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 100,
        page: 1,
      }
    }).then(res => setCoins(res.data));
  }, []);

  const addHolding = (e) => {
    e.preventDefault();
    const coin = e.target.coin.value;
    const amount = parseFloat(e.target.amount.value);
    const price = parseFloat(e.target.price.value);
    setHoldings([...holdings, { coin, amount, price }]);
    e.target.reset();
  };

  const getCurrentPrice = (coinId) => {
    const coin = coins.find(c => c.id === coinId);
    return coin?.current_price || 0;
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null) return '-';
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div style={{
      backgroundColor: '#0d1117',
      minHeight: '100vh',
      color: '#e6edf3',
      padding: '40px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#161b22',
        border: '1px solid #21262d',
        borderRadius: '8px',
        padding: '24px'
      }}>
        
        {/* Style tag for table hover and animations */}
        <style>{`
          .portfolio-row-hover:hover {
            background-color: #1c2128 !important;
          }
          .portfolio-btn:hover {
            opacity: 0.85;
          }
        `}</style>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          Portfolio
        </h2>

        {/* Input Form */}
        <form onSubmit={addHolding} style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <select
              name="coin"
              required
              style={{
                width: '100%',
                backgroundColor: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '10px 14px',
                fontSize: '14px',
                outline: 'none',
                height: '44px',
                cursor: 'pointer'
              }}
            >
              {coins.map(coin => (
                <option key={coin.id} value={coin.id}>{coin.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <input
              type="number"
              step="0.0001"
              name="amount"
              placeholder="Amount Owned"
              required
              style={{
                width: '100%',
                backgroundColor: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '10px 14px',
                fontSize: '14px',
                outline: 'none',
                height: '44px'
              }}
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <input
              type="number"
              step="0.01"
              name="price"
              placeholder="Buy Price ($)"
              required
              style={{
                width: '100%',
                backgroundColor: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '10px 14px',
                fontSize: '14px',
                outline: 'none',
                height: '44px'
              }}
            />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <button
              type="submit"
              className="portfolio-btn"
              style={{
                width: '100%',
                backgroundColor: '#00d4ff',
                color: '#0d1117',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                padding: '10px 24px',
                height: '44px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              Add
            </button>
          </div>
        </form>

        {/* Portfolio Table */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6edf3' }}>
            <thead>
              <tr style={{
                backgroundColor: '#0d1117',
                borderBottom: '1px solid #21262d',
                fontSize: '11px',
                color: '#8b949e',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: '600'
              }}>
                <th style={{ padding: '10px 20px', textAlign: 'left' }}>Coin</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>Buy Price</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>Current Price</th>
                <th style={{ padding: '10px 20px', textAlign: 'right' }}>P / L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const currentPrice = getCurrentPrice(h.coin);
                const profitLoss = (currentPrice - h.price) * h.amount;
                const isProfit = profitLoss >= 0;
                return (
                  <tr
                    key={i}
                    className="portfolio-row-hover"
                    style={{
                      borderBottom: '1px solid #21262d',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 'bold', textTransform: 'capitalize', color: '#ffffff' }}>
                      {h.coin}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace" }}>
                      {formatNumber(h.amount, 4)}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace" }}>
                      ${formatNumber(h.price, 2)}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontFamily: "'Courier New', Courier, monospace" }}>
                      ${formatNumber(currentPrice, 2)}
                    </td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      fontFamily: "'Courier New', Courier, monospace",
                      fontWeight: 'bold',
                      color: isProfit ? '#00ff88' : '#ff4444'
                    }}>
                      {isProfit ? '+' : ''}${formatNumber(profitLoss, 2)}
                    </td>
                  </tr>
                );
              })}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '48px 0', color: '#8b949e', fontSize: '15px' }}>
                    No positions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Portfolio;
