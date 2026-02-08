// movies/api/tmdb.js
export default async function handler(req, res) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({
        error: "Missing TMDB_API_KEY (add it in Vercel Environment Variables).",
      });
    }

    // path examples we will send from app.js:
    // search, genres, random, movie/123, movie/123/similar, movie/123/videos, etc.
    const rawPath = (req.query.path || "").toString().replace(/^\/+/, "");
    if (!rawPath) return res.status(400).json({ error: "Missing ?path=" });

    // Build TMDB endpoint mapping
    let tmdbPath = rawPath;

    // Friendly aliases -> real TMDB endpoints
    if (rawPath === "search") tmdbPath = "search/movie";
    if (rawPath === "genres") tmdbPath = "genre/movie/list";
    if (rawPath === "random") tmdbPath = "discover/movie";

    // If user requests: movie/123 => /movie/123
    // movie/123/similar => /movie/123/similar
    // etc — those are already valid TMDB paths

    const url = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);

    // Copy all query params except "path"
    for (const [k, v] of Object.entries(req.query)) {
      if (k === "path") continue;
      if (Array.isArray(v)) url.searchParams.set(k, v[0]);
      else if (v !== undefined) url.searchParams.set(k, v.toString());
    }

    // Add API key
    url.searchParams.set("api_key", API_KEY);

    // Sensible defaults
    if (!url.searchParams.get("language")) url.searchParams.set("language", "en-US");

    // If random: pick a random page (TMDB discover max is usually 500)
    if (rawPath === "random") {
      if (!url.searchParams.get("sort_by")) url.searchParams.set("sort_by", "popularity.desc");
      if (!url.searchParams.get("page")) {
        const page = Math.floor(Math.random() * 20) + 1; // keep it reliable
        url.searchParams.set("page", String(page));
      }
    }

    const r = await fetch(url.toString());
    const txt = await r.text();

    // Pass-through JSON
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(r.status).send(txt);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
}
