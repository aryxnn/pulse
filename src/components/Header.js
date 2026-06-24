import React from 'react';
import { Link } from 'react-router-dom';
import { CryptoState } from '../CryptoContext';
import AuthModal from './Athentication/AuthModal';
import { Avatar, Button } from '@material-ui/core';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import 'bootstrap/dist/css/bootstrap.min.css';

const Header = () => {
  const { currency, setCurrency, user, setAlert } = CryptoState();

  const logOut = () => {
    signOut(auth);
    setAlert({
      open: true,
      type: "success",
      message: "Logout Successfully!"
    });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Crypto Hunter
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/portfolio">
                Portfolio
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/converter">
                Converter
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/orderbook">
                Order Book
              </Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to="/watchlist">
                  Watchlist
                </Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center">
            <select
              className="form-select me-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100px' }}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>

            {user ? (
              <div className="d-flex align-items-center gap-2">
                <Avatar
                  src={user.photoURL}
                  alt={user.displayName || user.email}
                  style={{ width: 32, height: 32, marginRight: 8 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={logOut}
                  style={{ fontWeight: 600 }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <AuthModal />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
