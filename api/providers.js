import fetch from "node-fetch";

const TMDB_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res) {
  const { id, type } = req.query;

  if (!id || !type) {
    return res.status(400).json({ providers: [], link: null });
  }

  try {
    const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${TMDB_KEY}`;
    const r = await fetch(url);
    const j = await r.json();

    const ca = j?.results?.CA;

    if (!ca) {
      return res.status(200).json({ providers: [], link: null });
    }

    // merge all possible provider arrays
    const providers = [
      ...(ca.flatrate || []),
      ...(ca.free || []),
      ...(ca.ads || []),
      ...(ca.rent || []),
      ...(ca.buy || [])
    ];

    // dedupe providers
    const seen = new Set();
    const unique = providers.filter(p => {
      if (!p?.provider_id) return false;
      if (seen.has(p.provider_id)) return false;
      seen.add(p.provider_id);
      return true;
    });

    return res.status(200).json({
      providers: unique,
      link: ca.link || null
    });

  } catch (err) {
    console.error("providers api error", err);
    return res.status(500).json({ providers: [], link: null });
  }
}
