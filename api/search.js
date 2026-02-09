// api/search.js
import { tmdb, normalizeAny } from "./_tmdb.js";

const YEAR_MIN = 1950;

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const data = await tmdb("/search/multi", {
      query: q,
      include_adult: "false",
      page: 1,
    });

    let items = (data?.results || [])
      .filter(x => x && (x.media_type === "movie" || x.media_type === "tv"))
      .map(normalizeAny)
      .filter(x => (x.year ? x.year >= YEAR_MIN : true));

    items = items.slice(0, 12);

    const target = items[0] || null;

    return res.status(200).json({
      target,
      items,
      results: items
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      error: e?.message || "Search failed",
    });
  }
}
