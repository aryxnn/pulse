import './App.css';
import Header from './components/Header';
import Home from './Pages/Home';
import Watchlist from './Pages/Watchlist';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Alert from './components/Alert';
import Portfolio from './components/Portfolio';
import Converter from './components/Converter';
import CoinPage from './Pages/CoinPage';
import OrderBook from './Pages/OrderBook';

const useStyle = makeStyles(() => ({
  App: {
    backgroundColor: "#14161a",
    color: "#04b5e5",
    minHeight: '100vh',
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
          <Route path='/converter' element={<Converter />} />
          <Route path='/watchlist' element={<Watchlist />} />
          <Route path='/orderbook' element={<OrderBook />} />
        </Routes>
      </div>
      <Alert />
    </BrowserRouter>
  );
}

export default App;
