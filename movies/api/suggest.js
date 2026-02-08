// movies/api/suggest.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.status(200).json({ results: [] });

    const data = await tmdb("/search/movie", { query: q, include_adult: "false", page: 1 });
    const results = (data.results || []).slice(0, 10).map(normalizeMovie);

    res.status(200).json({ results });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
