import { tmdbFetch } from './_tmdb.js';

export default async function handler(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const data = await tmdbFetch(`/person/${id}/combined_credits`);
  res.status(200).json(data);
}