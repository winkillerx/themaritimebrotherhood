// movies/api/random.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const minRating = Number(req.query.minRating || 0);
    const genre = String(req.query.genre || "any");
    const yearMin = Number(req.query.yearMin || 2000);
    const yearMax = Number(req.query.yearMax || 9999);

    // Discover endpoint for random-ish picks
    const data = await tmdb("/discover/movie", {
      include_adult: "false",
      sort_by: "popularity.desc",
      "vote_average.gte": minRating,
      "primary_release_date.gte": `${yearMin}-01-01`,
      "primary_release_date.lte": `${yearMax}-12-31`,
      with_genres: genre !== "any" ? genre : "",
      page: 1,
    });

    const list = (data.results || []).map(normalizeMovie);
    if (!list.length) return res.status(200).json({ target: null });

    const pick = list[Math.floor(Math.random() * list.length)];
    res.status(200).json({ target: pick });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
