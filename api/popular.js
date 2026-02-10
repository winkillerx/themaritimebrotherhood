import { tmdb, normalizeMovie, normalizeTv } from './_tmdb.js';

// /api/popular?take=50
export default async function handler(req, res) {
  try {
    const take = Math.max(1, Math.min(100, Number(req.query.take || 50)));

    // Fetch enough pages to reach `take`
    const fetchMany = async (path, normalizer) => {
      const out = [];
      let page = 1;
      while (out.length < take && page <= 500) {
        const data = await tmdb(path, { page });
        const items = (data?.results || []).map(normalizer).filter(Boolean);
        out.push(...items);
        if (!data?.results?.length) break;
        page += 1;
      }
      return out.slice(0, take);
    };

    const [movies, tv] = await Promise.all([
      fetchMany('/movie/popular', normalizeMovie),
      fetchMany('/tv/popular', normalizeTv),
    ]);

    res.status(200).json({ movies, tv });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'popular failed' });
  }
}
