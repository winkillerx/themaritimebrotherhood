import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const [movies, tv] = await Promise.all([
      tmdb("/movie/popular", { page: 1 }),
      tmdb("/tv/popular", { page: 1 }),
    ]);

    res.status(200).json({
      movies: (movies.results || []).slice(0, 12).map(normalizeMovie),
      tv: (tv.results || []).slice(0, 12).map(m => ({
        id: m.id,
        title: m.name,
        year: m.first_air_date?.slice(0,4),
        rating: m.vote_average,
        overview: m.overview,
        poster: m.poster_path
          ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : "",
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
