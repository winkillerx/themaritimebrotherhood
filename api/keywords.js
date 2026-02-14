import fetch from "node-fetch";
const TMDB_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res) {
  if (!TMDB_KEY) return res.status(500).json({ error: "TMDB_API_KEY missing" });
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing q" });

  const url = `https://api.themoviedb.org/3/search/keyword?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  const j = await r.json();
  res.status(200).json({ results: j?.results || [] });
}
