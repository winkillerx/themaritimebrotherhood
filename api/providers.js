import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const key = process.env.TMDB_API_KEY;

    if (!key) {
      return res.status(500).json({
        error: "TMDB_API_KEY missing",
        env: Object.keys(process.env)
      });
    }

    const url = `https://api.themoviedb.org/3/movie/603/watch/providers?api_key=${key}`;
    const r = await fetch(url);
    const j = await r.json();

    return res.status(200).json({
      tmdbRaw: j
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}
