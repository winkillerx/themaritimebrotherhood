// api/videos.js
import { tmdb } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    const type = String(req.query.type || "movie").trim().toLowerCase(); // movie | tv
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type !== "movie" && type !== "tv") return res.status(400).json({ error: "Invalid type" });

    const data = await tmdb(`/${type}/${id}/videos`);
    const vids = data?.results || [];

    const pick =
      vids.find(v => v.site === "YouTube" && v.type === "Trailer") ||
      vids.find(v => v.site === "YouTube" && v.type === "Teaser") ||
      vids.find(v => v.site === "YouTube");

    if (!pick?.key) return res.json({ key: null });

    return res.json({
      key: pick.key,
      name: pick.name || "",
      site: pick.site,
      type: pick.type,
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Server error" });
  }
}
