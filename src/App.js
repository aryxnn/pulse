import './App.css';
import Header from './components/Header';
import Home from './Pages/Home';
import Watchlist from './Pages/Watchlist';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Alert from './components/Alert';
import Portfolio from './components/Portfolio';
import CoinPage from './Pages/CoinPage';
import OrderBook from './Pages/OrderBook';

const useStyle = makeStyles(() => ({
  App: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    minHeight: '100vh',
    fontFamily: "system-ui, -apple-system, sans-serif"
  }
}));

function App() {
  const classes = useStyle();

  return (
    <BrowserRouter>
      <div className={classes.App}>
        <Header />
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/coins/:id' element={<CoinPage />} />
          <Route path='/portfolio' element={<Portfolio />} />
          <Route path='/watchlist' element={<Watchlist />} />
          <Route path='/orderbook' element={<OrderBook />} />
        </Routes>
      </div>
      <Alert />
    </BrowserRouter>
  );
}

export default App;
