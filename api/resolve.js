// api/resolve.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

function pickTrailerKey(videos) {
  const list = videos?.results || [];
  const yt = list.filter(v => v.site === "YouTube");

  // Prefer Trailer, then Teaser, then anything YouTube
  const best =
    yt.find(v => v.type === "Trailer") ||
    yt.find(v => v.type === "Teaser") ||
    yt[0];

  return best?.key || "";
}

export default async function handler(req, res) {
  try {
    const id = (req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    // Pull full movie detail + videos in one call
    const movie = await tmdb(`/movie/${id}`, { append_to_response: "videos" });

    const m = normalizeMovie(movie);
    const trailerKey = pickTrailerKey(movie.videos);

    return res.status(200).json({
      ...m,
      trailerKey,
      tmdbUrl: `https://www.themoviedb.org/movie/${m.id}`,
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
