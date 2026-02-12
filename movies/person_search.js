// /api/person_search?q=...
export default async function handler(req, res) {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    const key = process.env.TMDB_KEY;
    if (!key) return res.status(500).json({ error: 'Missing TMDB_KEY env var' });

    const url = new URL('https://api.themoviedb.org/3/search/person');
    url.searchParams.set('api_key', key);
    url.searchParams.set('query', q);
    url.searchParams.set('include_adult', 'false');

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) return res.status(r.status).json({ error: data?.status_message || 'TMDb error', code: data?.status_code });

    // normalize + keep only essentials
    const results = (data.results || []).map(p => ({
      id: p.id,
      name: p.name,
      profile: p.profile_path ? `https://image.tmdb.org/t/p/w500${p.profile_path}` : '',
      known_for_department: p.known_for_department || '',
      popularity: p.popularity || 0,
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
