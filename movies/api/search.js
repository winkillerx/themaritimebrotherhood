// movies/api/search.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    // 1️⃣ Search movie
    const searchData = await tmdb("/search/movie", {
      query: q,
      include_adult: "false",
      page: 1,
    });

    const items = (searchData.results || []).map(normalizeMovie);
    const target = items[0];

    if (!target) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // 2️⃣ Get similar movies
    const similarData = await tmdb(`/movie/${target.id}/similar`, {
      page: 1,
    });

    const similar = (similarData.results || []).map(normalizeMovie);

    // 3️⃣ Send everything your UI needs
    res.status(200).json({
      target,
      similar,
      items,
    });

  } catch (e) {
    res.status(e.statusCode || 500).json({
      error: e.message || "Unknown error",
    });
  }
}
