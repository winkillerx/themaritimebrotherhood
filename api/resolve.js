// api/resolve.js
import { tmdb, normalizeAny } from "./_tmdb.js";

function pickTrailerKey(videos) {
  const list = videos?.results || [];
  const yt = list.filter(v => v.site === "YouTube");
  const best =
    yt.find(v => v.type === "Trailer") ||
    yt.find(v => v.type === "Teaser") ||
    yt[0];
  return best?.key || "";
}

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    const type = String(req.query.type || "movie").trim().toLowerCase(); // movie | tv
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type !== "movie" && type !== "tv") return res.status(400).json({ error: "Invalid type" });

    const item = await tmdb(`/${type}/${id}`, { append_to_response: "videos" });

    const m = normalizeAny(item, type);
    const trailerKey = pickTrailerKey(item.videos);

    return res.status(200).json({
      target: {
        ...m,
        trailerKey,
        tmdbUrl: `https://www.themoviedb.org/${type}/${m.id}`,
      },
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
