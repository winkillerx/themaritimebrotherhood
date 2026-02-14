import fetch from "node-fetch";

const TMDB_KEY = process.env.TMDB_API_KEY;

function img(path) {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : "";
}

export default async function handler(req, res) {
  try {
    if (!TMDB_KEY) return res.status(500).json({ error: "TMDB_API_KEY missing" });

    const {
      type = "both",              // movie | tv | both
      keywords = "",              // comma separated keyword IDs
      genres = "",                // comma separated genre IDs
      page = "1",
      sort = "popularity.desc",   // popularity.desc | vote_count.desc
      minVotes = "50",
      region = "CA",
    } = req.query;

    const base = "https://api.themoviedb.org/3";
    const common = `api_key=${TMDB_KEY}&language=en-US&page=${encodeURIComponent(page)}&sort_by=${encodeURIComponent(sort)}&vote_count.gte=${encodeURIComponent(minVotes)}&watch_region=${encodeURIComponent(region)}`;

    const withKeywords = keywords ? `&with_keywords=${encodeURIComponent(keywords)}` : "";
    const withGenres = genres ? `&with_genres=${encodeURIComponent(genres)}` : "";

    const urls = [];
    if (type === "movie" || type === "both") urls.push(`${base}/discover/movie?${common}${withKeywords}${withGenres}`);
    if (type === "tv" || type === "both") urls.push(`${base}/discover/tv?${common}${withKeywords}${withGenres}`);

    const results = [];
    for (const u of urls) {
      const r = await fetch(u);
      const j = await r.json();
      const arr = Array.isArray(j?.results) ? j.results : [];
      for (const it of arr) {
        const mediaType = it?.title ? "movie" : "tv";
        results.push({
          id: it.id,
          type: mediaType,
          title: it.title || it.name || "",
          year: (it.release_date || it.first_air_date || "").slice(0, 4),
          rating: it.vote_average ?? null,
          poster: img(it.poster_path),
          overview: it.overview || "",
        });
      }
    }

    // de-dupe by id+type
    const seen = new Set();
    const deduped = results.filter(x => {
      const k = `${x.type}:${x.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    res.status(200).json({ items: deduped });
  } catch (e) {
    res.status(500).json({ error: e.message || "Discover failed" });
  }
}
