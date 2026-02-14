import fetch from "node-fetch";

const TMDB_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res) {
  try {
    const { id, type } = req.query;

    if (!id || !type) {
      return res.status(400).json({ error: "Missing id or type" });
    }

    const mediaType = type === "tv" ? "tv" : "movie";

    const url = `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${TMDB_KEY}`;
    const r = await fetch(url);
    const j = await r.json();

    const ca = j?.results?.CA;

    if (!ca) {
      return res.status(200).json({
        providers: [],
        link: null,
      });
    }

    const providers = [
      ...(ca.flatrate || []),
      ...(ca.free || []),
      ...(ca.ads || []),
      ...(ca.rent || []),
      ...(ca.buy || []),
    ];

    // Deduplicate
    const seen = new Set();
    const uniqueProviders = providers.filter(p => {
      if (!p?.provider_id) return false;
      if (seen.has(p.provider_id)) return false;
      seen.add(p.provider_id);
      return true;
    });

    res.status(200).json({
      providers: uniqueProviders,
      link: ca.link || null,
    });

  } catch (err) {
    console.error("providers error:", err);
    res.status(500).json({
      providers: [],
      link: null,
      error: "Provider lookup failed",
    });
  }
}
