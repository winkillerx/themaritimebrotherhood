import { tmdbFetch } from './_tmdb.js';

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    // 🔍 SEARCH ACTORS
    if (type === 'search') {
      const q = (req.query.q || '').trim();
      if (!q) return res.status(400).json({ error: 'Missing q' });

      const data = await tmdbFetch(
        `/search/person?query=${encodeURIComponent(q)}`
      );

      return res.status(200).json(data);
    }

    // 👤 ACTOR DETAILS (Target)
    if (type === 'details') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const data = await tmdbFetch(`/person/${id}`);
      return res.status(200).json(data);
    }

    // 🎬 ACTOR CREDITS (Similar)
    if (type === 'credits') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const data = await tmdbFetch(`/person/${id}/combined_credits`);
      return res.status(200).json(data);
    }

    // ❌ INVALID
    return res.status(400).json({ error: 'Invalid type' });

  } catch (err) {
    return res.status(500).json({
      error: 'TMDb error',
      detail: err.message
    });
  }
}
