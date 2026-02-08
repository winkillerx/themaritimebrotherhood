// movies/api/search.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const data = await tmdb("/search/movie", {
      query: q,
      include_adult: "false",
      page: 1,
    });

    const items = (data?.results || []).map(normalizeMovie);
    const target = items[0] || null;

    // ✅ Return both `items` and `results` for frontend compatibility
    return res.status(200).json({
      target,
      items,
      results: items,
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      error: e?.message || "Search failed",
    });
  }
}
