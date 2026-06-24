import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CryptoState } from '../CryptoContext';
import { coinWithComa } from './Banner/Corousels';
import { Pagination } from '@material-ui/lab';

const CoinTable = () => {
  const { currency, symbol, coins, loading, fetchCoins } = CryptoState();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCoins();
  }, [currency]);

  const handleSearch = () => {
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(search.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(search.toLowerCase())
    );
  };

  const filteredCoins = handleSearch();

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Material UI Pagination CSS overrides */}
      <style>{`
        .MuiPaginationItem-root {
          color: #8b949e !important;
          border-color: #21262d !important;
          font-family: system-ui, sans-serif !important;
        }
        .MuiPaginationItem-root.Mui-selected {
          background-color: transparent !important;
          color: #00d4ff !important;
          border-color: #00d4ff !important;
        }
        .MuiPaginationItem-root:hover {
          background-color: #1c2128 !important;
        }
        .table-row-hover:hover {
          background-color: #1c2128 !important;
        }
      `}</style>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search for a Crypto Currency..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{
          width: '100%',
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: '6px',
          color: '#e6edf3',
          padding: '10px 16px',
          outline: 'none',
          marginBottom: '20px',
          fontSize: '14px',
        }}
      />

      {/* Market Cap Table Wrapper */}
      <div style={{
        backgroundColor: '#161b22',
        border: '1px solid #21262d',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
            Loading markets...
          </div>
        ) : (
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
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>24h Change</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins
                  .slice((page - 1) * 10, (page - 1) * 10 + 10)
                  .map((row) => {
                    const profit = row.price_change_percentage_24h > 0;
                    return (
                      <tr
                        key={row.name}
                        onClick={() => navigate(`/coins/${row.id}`)}
                        className="table-row-hover"
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid #21262d',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Coin Info Column */}
                        <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={row?.image} alt={row.name} height="32" width="32" style={{ borderRadius: '50%' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
                              {row.name}
                            </span>
                            <span style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase' }}>
                              {row.symbol}
                            </span>
                          </div>
                        </td>

                        {/* Price Column */}
                        <td style={{
                          padding: '12px 20px',
                          textAlign: 'right',
                          fontFamily: "'Courier New', Courier, monospace",
                          color: '#ffffff',
                          fontWeight: 'bold'
                        }}>
                          {symbol} {coinWithComa(row.current_price.toFixed(2))}
                        </td>

                        {/* 24h Change Column */}
                        <td style={{
                          padding: '12px 20px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: profit ? '#00ff88' : '#ff4444',
                          fontFamily: "'Courier New', Courier, monospace"
                        }}>
                          {profit && '+'}
                          {row.price_change_percentage_24h.toFixed(2)}%
                        </td>

                        {/* Market Cap Column */}
                        <td style={{
                          padding: '12px 20px',
                          textAlign: 'right',
                          color: '#8b949e',
                          fontFamily: "'Courier New', Courier, monospace"
                        }}>
                          {symbol} {coinWithComa(row.market_cap.toString().slice(0, -6))}M
                        </td>
                      </tr>
                    );
                  })}
                {filteredCoins.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e' }}>
                      No matching cryptocurrencies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
        <Pagination
          count={Math.ceil(filteredCoins.length / 10)}
          page={page}
          onChange={(_, value) => {
            setPage(value);
            window.scroll(0, 0);
          }}
          variant="outlined"
          shape="rounded"
        />
      </div>
    </div>
  );
};

export default CoinTable;
