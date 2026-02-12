// /api/person_credits?id=...
export default async function handler(req, res) {
  try {
    const id = (req.query.id || '').toString().trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const key = process.env.TMDB_KEY;
    if (!key) return res.status(500).json({ error: 'Missing TMDB_KEY env var' });

    const url = new URL(`https://api.themoviedb.org/3/person/${encodeURIComponent(id)}/combined_credits`);
    url.searchParams.set('api_key', key);

    const r = await fetch(url);
    const c = await r.json();

    if (!r.ok) return res.status(r.status).json({ error: c?.status_message || 'TMDb error', code: c?.status_code });

    // keep cast credits only
    const cast = (c.cast || []).map(x => ({
      id: x.id,
      media_type: x.media_type,
      title: x.title || x.name || '',
      release_date: x.release_date || x.first_air_date || '',
      vote_average: x.vote_average,
      poster_path: x.poster_path || '',
      overview: x.overview || '',
      genre_ids: x.genre_ids || [],
    }));

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ cast });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
