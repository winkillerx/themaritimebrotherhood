import { tmdb, normalizeMovie, normalizeTv, normalizeAny } from './_tmdb.js';

// /api/random?minRating=...&genre=...&yearMin=...&media=any|movie|tv
// NOTE: Random previously used /discover which can occasionally throw TMDb 500.
// This implementation uses trending/popular pools + filtering for stability.
export default async function handler(req, res) {
  try {
    const minRating = Number(req.query.minRating || 0) || 0;
    const genre = String(req.query.genre || 'any').trim().toLowerCase();
    const yearMin = Number(req.query.yearMin || 1950) || 1950;
    const media = String(req.query.media || 'any').trim().toLowerCase();

    const want = media === 'movie' || media === 'tv' ? media : 'any';

    // helper: filter + normalize
    const pickFrom = (rawItems, typeHint) => {
      const list = (rawItems || []).filter(Boolean).map((it) => {
        // normalize first to give us year/rating/title/type
        if (typeHint === 'movie') return normalizeMovie(it);
        if (typeHint === 'tv') return normalizeTv(it);
        return normalizeAny(it);
      });

      const filtered = list.filter((m) => {
        if (!m || !m.id) return false;
        if (typeof m.rating === 'number' && m.rating < minRating) return false;
        if (m.year && Number(m.year) < yearMin) return false;
        if (genre !== 'any') {
          const gid = Number(genre);
          if (Number.isFinite(gid)) {
            const g = Array.isArray(m.genres) ? m.genres.map(Number) : [];
            if (!g.includes(gid)) return false;
          }
        }
        if (want !== 'any' && String(m.type || '').toLowerCase() !== want) return false;
        return true;
      });

      if (!filtered.length) return null;
      const idx = Math.floor(Math.random() * filtered.length);
      return filtered[idx];
    };

    // 1) Trending pool (bigger mix; stable endpoints)
    try {
      const trend = await tmdb(`/trending/all/week`, { page: 1 });
      const picked = pickFrom(trend?.results || [], 'any');
      if (picked) return res.status(200).json({ target: picked });
    } catch {
      // ignore
    }

    // 2) Popular pool (movies + tv)
    try {
      const [pm, pt] = await Promise.all([
        tmdb(`/movie/popular`, { page: 1 }),
        tmdb(`/tv/popular`, { page: 1 }),
      ]);

      const pool = [...(pm?.results || []).map((x) => ({ ...x, __type: 'movie' })), ...(pt?.results || []).map((x) => ({ ...x, __type: 'tv' }))];
      const picked = pickFrom(pool, 'any');
      if (picked) return res.status(200).json({ target: picked });
    } catch {
      // ignore
    }

    return res.status(404).json({ error: 'No random title found for the current filters.' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Random failed' });
  }
}
