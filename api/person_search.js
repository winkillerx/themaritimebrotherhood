import { tmdbFetch } from './_tmdb.js';

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const data = await tmdbFetch(`/search/person?query=${encodeURIComponent(q)}`);
  res.status(200).json(data);
}