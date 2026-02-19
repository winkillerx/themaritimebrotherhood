export default async function handler(req, res) {
  try {
    const { id } = req.query; // IMDb id like tt0133093
    if (!id) return res.status(400).send("Missing id");

    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) return res.status(500).send("Missing TMDB_API_KEY env var");

    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(id)}?external_source=imdb_id&api_key=${TMDB_API_KEY}`
    );
    if (!tmdbRes.ok) return res.status(502).send("TMDb error");

    const data = await tmdbRes.json();
    const movie = (data.movie_results && data.movie_results[0]) || (data.tv_results && data.tv_results[0]);

    if (!movie) return res.status(404).send("Not found");

    const title = movie.title || movie.name || "Film Matrix";
    const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : `https://${req.headers.host}/og.jpg`;

    const type = movie.title ? "movie" : "tv";
    const redirectUrl = `https://${req.headers.host}/?id=${encodeURIComponent(movie.id)}&type=${type}`;
    const ogUrl = `https://${req.headers.host}/movie/${encodeURIComponent(id)}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}${year ? ` (${escapeHtml(year)})` : ""}">
<meta property="og:description" content="${escapeHtml(`Find movies similar to ${title}`)}">
<meta property="og:image" content="${escapeHtml(poster)}">
<meta property="og:url" content="${escapeHtml(ogUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}${year ? ` (${escapeHtml(year)})` : ""}">
<meta name="twitter:description" content="${escapeHtml(`Find movies similar to ${title}`)}">
<meta name="twitter:image" content="${escapeHtml(poster)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body></body>
</html>`);
  } catch {
    res.status(500).send("OG error");
  }
}

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
