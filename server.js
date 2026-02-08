const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB = process.env.TMDB_API_KEY;

app.use(express.static(__dirname));

app.get('/api/search', async (req, res) => {
  const r = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB}&query=${req.query.query}`);
  const d = await r.json();
  res.json(d);
});

app.get('/api/similar', async (req, res) => {
  const r = await fetch(`https://api.themoviedb.org/3/movie/${req.query.id}/similar?api_key=${TMDB}`);
  const d = await r.json();
  res.json(d);
});

app.listen(PORT, () => console.log("Server running"));
