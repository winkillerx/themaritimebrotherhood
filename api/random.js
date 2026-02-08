// movies/api/random.js
import { tmdb, normalizeMovie, pickYear } from "./_tmdb.js";

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function handler(req, res) {
  try {
    const minRating = Number(req.query.minRating || 0);
    const genre = (req.query.genre || "any").toLowerCase();

    // ✅ default 1950
    const yearMin = Number(req.query.yearMin || 1950);
    const yearMax = Number(req.query.yearMax || 9999);

    const page = 1 + Math.floor(Math.random() * 5);

    const discover = await tmdb("/discover/movie", {
      sort_by: "popularity.desc",
      "vote_count.gte": 200,
      page,
      include_adult: "false",
    });

    let items = (discover.results || []).map(normalizeMovie);

    if (Number.isFinite(minRating) && minRating > 0) {
      items = items.filter(m => (m.rating || 0) >= minRating);
    }

    items = items.filter(m => {
      const y = m.year ?? pickYear(m);
      if (!y) return false;
      return y >= yearMin && y <= yearMax;
    });

    if (genre !== "any") {
      const genreId = Number(genre);
      if (Number.isFinite(genreId) && genreId > 0) {
        items = items.filter(m => Array.isArray(m.genres) && m.genres.includes(genreId));
      }
    }

    const target = rand(items);
    if (!target) return res.status(404).json({ error: "No results for filters" });

    res.status(200).json({ target, items });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
