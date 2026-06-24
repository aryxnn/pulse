import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { createContext, useEffect, useState } from 'react';
import { useContext } from 'react';
import { CoinList } from './config/api';
import { auth, db } from './firebase';
const Crypto = createContext();
const CryptoContext = ({ children }) => {
   const [currency, setCurrency] = useState('INR');
   const [symbol, setSymbol] = useState("₹");
   const [coins, setCoins] = useState([]);
   const [loading, setLoading] = useState(false);
   const [user, setUser] = useState(null);
   const [alert, setAlert] = useState({
      open: false,
      message: "",
      type: "Success"
   });
   const [watchlist, setWatchlist] = useState([]);

   useEffect(() => {
      if (user) {
         const coinref = doc(db, "watchlist", user.uid);
         var unsuscribe = onSnapshot(coinref, coin => {
            if (coin.exists()) {
               console.log(coin.data().coins)
               setWatchlist(coin.data().coins);
            } else {
               console.log("No Items in Watchlist")
            }
         });
         return () => {
            unsuscribe();
         }
      }
   }, [user])

   useEffect(() => {
      onAuthStateChanged(auth, user => {
         if (user) setUser(user);
         else setUser(null);
         console.log(user);
      })
   })
   const fetchCoins = async () => {
      setLoading(true);
      try {
         const { data } = await axios.get(CoinList(currency));
         setCoins(data);
      } catch (err) {
         console.error("Failed to fetch coins:", err);
      } finally {
         setLoading(false);
      }
   }
   useEffect(() => {

      if (currency === "INR") setSymbol("₹");
      else if (currency === "USD") setSymbol("$");
   }, [currency]);


   return <Crypto.Provider value={{ currency, symbol, setCurrency, coins, loading, fetchCoins, alert, setAlert, user, watchlist, setWatchlist }}>{children}</Crypto.Provider>
}



export default CryptoContext;


export const CryptoState = () => {
   return useContext(Crypto);
}