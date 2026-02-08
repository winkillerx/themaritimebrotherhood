// movies/api/similar.js
import { tmdb, normalizeMovie, pickYear } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const id = (req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const minRating = Number(req.query.minRating || 0);
    const genre = (req.query.genre || "any").toLowerCase();

    // ✅ default 1950
    const yearMin = Number(req.query.yearMin || 1950);
    const yearMax = Number(req.query.yearMax || 9999);

    const targetRaw = await tmdb(`/movie/${id}`);
    const target = normalizeMovie(targetRaw);

    const simData = await tmdb(`/movie/${id}/similar`, { page: 1 });
    let items = (simData.results || []).map(normalizeMovie);

    // filter: rating
    if (Number.isFinite(minRating) && minRating > 0) {
      items = items.filter(m => (m.rating || 0) >= minRating);
    }

    // filter: year
    items = items.filter(m => {
      const y = m.year ?? pickYear(m);
      if (!y) return false;
      return y >= yearMin && y <= yearMax;
    });

    // filter: genre
    if (genre !== "any") {
      const genreId = Number(genre);
      if (Number.isFinite(genreId) && genreId > 0) {
        items = items.filter(m => Array.isArray(m.genres) && m.genres.includes(genreId));
      }
    }

    res.status(200).json({ target, similar: items });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
