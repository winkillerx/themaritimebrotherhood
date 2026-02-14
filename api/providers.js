// /api/providers.js
import fetch from "node-fetch";

const TMDB_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res) {
  try {
    // Allow CORS (optional but helpful)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (!TMDB_KEY) {
      return res.status(500).json({
        error: "TMDB_API_KEY missing"
      });
    }

    const { id, type } = req.query;

    const safeType = String(type || "").toLowerCase();
    if (!id || !["movie", "tv"].includes(safeType)) {
      return res.status(400).json({
        error: "Missing or invalid id/type. Use type=movie or type=tv"
      });
    }

    const url = `https://api.themoviedb.org/3/${safeType}/${encodeURIComponent(
      id
    )}/watch/providers?api_key=${encodeURIComponent(TMDB_KEY)}`;

    const r = await fetch(url);
    const j = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "TMDb error",
        status: r.status,
        details: j
      });
    }

    // Canada region block
    const region = j?.results?.CA || null;

    // If no CA entry, return empty (means no providers in Canada on TMDb)
    if (!region) {
      return res.status(200).json({ providers: [], link: null });
    }

    // Merge all provider types (streaming first)
    const all = [
      ...(region.flatrate || []), // streaming
      ...(region.free || []),
      ...(region.ads || []),
      ...(region.rent || []),
      ...(region.buy || [])
    ];

    // Deduplicate providers
    const seen = new Set();
    const providers = all.filter((p) => {
      const key = p?.provider_id ?? p?.provider_name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // TMDb provides a single link per region
    const link = region.link || null;

    return res.status(200).json({ providers, link });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err?.message || String(err)
    });
  }
}
