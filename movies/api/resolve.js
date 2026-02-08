// movies/api/resolve.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const data = await tmdb(`/movie/${encodeURIComponent(id)}`, {});
    res.status(200).json({ target: normalizeMovie(data) });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
