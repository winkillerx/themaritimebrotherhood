import { tmdb } from './_tmdb.js';

// /api/genres  => { movie:[{id,name}], tv:[{id,name}], all:[{id,name,type}] }
export default async function handler(req, res) {
  try {
    const [m, t] = await Promise.all([
      tmdb('/genre/movie/list'),
      tmdb('/genre/tv/list'),
    ]);

    const movie = Array.isArray(m?.genres) ? m.genres : [];
    const tv = Array.isArray(t?.genres) ? t.genres : [];

    // Build a combined list (dedupe by id+type)
    const all = [
      ...movie.map(g => ({ id: g.id, name: g.name, type: 'movie' })),
      ...tv.map(g => ({ id: g.id, name: g.name, type: 'tv' })),
    ];

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ movie, tv, all });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'genres failed' });
  }
}
