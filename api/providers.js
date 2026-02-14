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

    // Prefer CA, fallback to US
    const region =
      j.results?.CA ||
      j.results?.US ||
      j.results?.GB ||
      null;

    if (!region) {
      return res.status(200).json({ providers: [], link: null });
    }

    const all = [
      ...(region.flatrate || []),
      ...(region.free || []),
      ...(region.ads || []),
      ...(region.rent || []),
      ...(region.buy || []),
    ];

    // De-duplicate providers
    const seen = new Set();
    const providers = all.filter(p => {
      if (!p?.provider_id) return false;
      if (seen.has(p.provider_id)) return false;
      seen.add(p.provider_id);
      return true;
    });

    return res.status(200).json({
      providers,
      link: region.link || null
    });

  } catch (err) {
    return res.status(500).json({ providers: [], link: null });
  }
}
