// api/suggest.js
import { tmdb, normalizeAny } from "./_tmdb.js";

const YEAR_MIN = 1950;

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.status(200).json({ results: [] });

    const data = await tmdb("/search/multi", { query: q, include_adult: "false", page: 1 });
    const results = (data?.results || [])
      .filter(x => x && (x.media_type === "movie" || x.media_type === "tv"))
      .map(normalizeAny)
      .filter(x => (x.year ? x.year >= YEAR_MIN : true))
      .slice(0, 10);

    return res.status(200).json({ results });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
