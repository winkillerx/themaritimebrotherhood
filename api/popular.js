// api/popular.js
import { tmdb, normalizeAny } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const page = Number(req.query?.page || 1) || 1;
    const media = String(req.query?.media || "any").toLowerCase(); // any|movie|tv

    res.setHeader("Content-Type", "application/json");
    // small cache is fine for popular lists
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    // helpers that never throw outward
    const safeFetch = async (fn) => {
      try {
        return await fn();
      } catch {
        return null;
      }
    };

    const moviesPromise =
      media === "tv"
        ? Promise.resolve([])
        : safeFetch(async () => {
            const j = await tmdb("/movie/popular", { page, language: "en-US" });
            return (j.results || []).map((x) => normalizeAny(x, "movie")).filter(Boolean);
          });

    const tvPromise =
      media === "movie"
        ? Promise.resolve([])
        : safeFetch(async () => {
            const j = await tmdb("/tv/popular", { page, language: "en-US" });
            return (j.results || []).map((x) => normalizeAny(x, "tv")).filter(Boolean);
          });

    const [movies, tv] = await Promise.all([moviesPromise, tvPromise]);

    // If TMDb is fully down, both may be [] — still return 200 so frontend can render “unavailable” cleanly
    return res.status(200).json({
      movies: Array.isArray(movies) ? movies : [],
      tv: Array.isArray(tv) ? tv : [],
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "popular failed" });
  }
}
