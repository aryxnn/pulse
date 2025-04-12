import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { SingleCoin } from '../config/api';
import { CryptoState } from '../CryptoContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AiOutlineStar, AiFillStar } from 'react-icons/ai';

const CoinPage = () => {
  const { id } = useParams();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, watchlist, setAlert } = CryptoState();

  useEffect(() => {
    const fetchCoin = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(SingleCoin(id));
        setCoin(data);
      } catch (err) {
        setError('Failed to fetch coin data.');
      } finally {
        setLoading(false);
      }
    };
    fetchCoin();
  }, [id]);

  const inWatchlist = watchlist?.includes(coin?.id);

  const addToWatchlist = async () => {
    const coinRef = doc(db, "watchlist", user.uid);
    try {
      await setDoc(coinRef, {
        coins: watchlist ? [...watchlist, coin.id] : [coin.id],
      });
      setAlert({
        open: true,
        message: `${coin.name} added to your Watchlist!`,
        type: "success",
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        type: "error",
      });
    }
  };

  const removeFromWatchlist = async () => {
    const coinRef = doc(db, "watchlist", user.uid);
    try {
      await setDoc(coinRef, {
        coins: watchlist.filter((watch) => watch !== coin.id),
      });
      setAlert({
        open: true,
        message: `${coin.name} removed from your Watchlist!`,
        type: "warning",
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        type: "error",
      });
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="container mt-4">
      <h2>
        {coin.name} ({coin.symbol.toUpperCase()})
      </h2>

      <div className="mt-3">
        <img src={coin.image.large} alt={coin.name} height="100" />
        <p dangerouslySetInnerHTML={{ __html: coin.description.en.split('. ')[0] + '.' }} />
        <p><strong>Market Cap Rank:</strong> #{coin.market_cap_rank}</p>
        <p><strong>Current Price:</strong> ${coin.market_data.current_price.usd.toLocaleString()}</p>
        <p><strong>Homepage:</strong> <a href={coin.links.homepage[0]} target="_blank" rel="noopener noreferrer">{coin.links.homepage[0]}</a></p>
      </div>

      {user && (
        <div className="mt-4">
          <button
            className={`btn ${inWatchlist ? "btn-danger" : "btn-success"}`}
            onClick={inWatchlist ? removeFromWatchlist : addToWatchlist}
          >
            {inWatchlist ? (
              <>
                <AiFillStar style={{ marginBottom: '3px' }} /> Remove from Watchlist
              </>
            ) : (
              <>
                <AiOutlineStar style={{ marginBottom: '3px' }} /> Add to Watchlist
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default CoinPage;
