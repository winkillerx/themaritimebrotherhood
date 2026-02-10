import { tmdb, normalizeTv } from './_tmdb.js';

// /api/popular-tv?page=1&take=50
export default async function handler(req, res) {
  try {
    const take = Math.max(1, Math.min(100, Number(req.query.take || 50)));
    const startPage = Math.max(1, Math.min(500, Number(req.query.page || 1)));

    let page = startPage;
    const out = [];

    while (out.length < take && page <= 500) {
      const data = await tmdb(`/tv/popular?page=${page}`);
      for (const r of (data?.results || [])) out.push(normalizeTv(r));
      page += 1;
      if (!(data?.results || []).length) break;
    }

    res.status(200).json({ results: out.slice(0, take) });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Popular TV failed' });
  }
}
