// /api/person?id=...
export default async function handler(req, res) {
  try {
    const id = (req.query.id || '').toString().trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const key = process.env.TMDB_KEY;
    if (!key) return res.status(500).json({ error: 'Missing TMDB_KEY env var' });

    const url = new URL(`https://api.themoviedb.org/3/person/${encodeURIComponent(id)}`);
    url.searchParams.set('api_key', key);

    const r = await fetch(url);
    const p = await r.json();

    if (!r.ok) return res.status(r.status).json({ error: p?.status_message || 'TMDb error', code: p?.status_code });

    const person = {
      id: p.id,
      name: p.name,
      biography: p.biography || '',
      birthday: p.birthday || '',
      place_of_birth: p.place_of_birth || '',
      known_for_department: p.known_for_department || '',
      profile: p.profile_path ? `https://image.tmdb.org/t/p/w500${p.profile_path}` : '',
    };

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ person });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
