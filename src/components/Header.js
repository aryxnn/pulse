import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { CryptoState } from '../CryptoContext';

const Header = () => {
  const { currency, setCurrency } = CryptoState();

  const getLinkStyle = ({ isActive }) => ({
    color: isActive ? '#e6edf3' : '#8b949e',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '18px 0',
    borderBottom: isActive ? '2px solid #00d4ff' : '2px solid transparent',
    transition: 'all 0.2s ease',
  });

  return (
    <nav style={{
      backgroundColor: '#0d1117',
      borderBottom: '1px solid #21262d',
      height: '56px',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Brand logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{
          color: '#00d4ff',
          fontSize: '20px',
          fontWeight: 'bold',
          letterSpacing: '-0.02em'
        }}>
          Pulse
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        height: '100%'
      }}>
        <NavLink to="/" style={getLinkStyle}>
          Home
        </NavLink>
        <NavLink to="/portfolio" style={getLinkStyle}>
          Portfolio
        </NavLink>
        <NavLink to="/orderbook" style={getLinkStyle}>
          Order Book
        </NavLink>
      </div>

      {/* Currency Selector */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{
            backgroundColor: '#0d1117',
            color: '#ffffff',
            border: '1px solid #00d4ff',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: '500',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
      </div>
    </nav>
  );
};

export default Header;
