import { tmdb, normalizeMovie, normalizeTv } from './_tmdb.js';

// /api/genre?genre=28&media=any|movie|tv&minRating=0&yearMin=1950&take=50
// Returns titles in a given genre (discover)
export default async function handler(req, res) {
  try {
    const genre = String(req.query.genre || '').trim();
    const media = String(req.query.media || 'any').toLowerCase();
    const minRating = Number(req.query.minRating || 0) || 0;
    const yearMin = Number(req.query.yearMin || 1950) || 1950;
    const take = Math.max(1, Math.min(100, Number(req.query.take || 50)));

    if (!genre || genre === 'any') {
      res.status(400).json({ error: 'genre is required' });
      return;
    }

    const getMany = async (path, normalizer) => {
      let page = 1;
      const out = [];
      while (out.length < take && page <= 500) {
        const data = await tmdb(path, {
          with_genres: genre,
          'vote_average.gte': minRating,
          sort_by: 'popularity.desc',
          include_adult: false,
          page,
          ...(path.includes('/movie') ? { primary_release_date_gte: `${yearMin}-01-01` } : { first_air_date_gte: `${yearMin}-01-01` }),
        });

        const results = Array.isArray(data?.results) ? data.results : [];
        if (!results.length) break;

        for (const r of results) {
          const n = normalizer(r);
          if (n?.id) out.push(n);
          if (out.length >= take) break;
        }
        page += 1;
      }
      return out;
    };

    if (media === 'movie') {
      const results = await getMany('/discover/movie', normalizeMovie);
      res.status(200).json({ results });
      return;
    }

    if (media === 'tv') {
      const results = await getMany('/discover/tv', normalizeTv);
      res.status(200).json({ results });
      return;
    }

    // any: mix movie+tv
    const [movies, tv] = await Promise.all([
      getMany('/discover/movie', normalizeMovie),
      getMany('/discover/tv', normalizeTv),
    ]);

    // mix them roughly evenly
    const mixed = [];
    for (let i = 0; i < Math.max(movies.length, tv.length) && mixed.length < take; i++) {
      if (movies[i]) mixed.push(movies[i]);
      if (tv[i] && mixed.length < take) mixed.push(tv[i]);
    }

    res.status(200).json({ results: mixed });
  } catch (err) {
    const msg = err?.message || 'genre failed';
    res.status(500).json({ error: msg });
  }
}
