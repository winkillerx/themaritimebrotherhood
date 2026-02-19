export default async function handler(req, res) {
  try {
    const { id, type } = req.query;

    if (!id || !type) return res.status(400).send("Missing id/type");

    const TMDB_KEY = process.env.TMDB_KEY;
    if (!TMDB_KEY) return res.status(500).send("Missing TMDB_KEY env var");

    const isMovie = type === "movie";
    const endpoint = isMovie
      ? `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}`
      : `https://api.themoviedb.org/3/tv/${encodeURIComponent(id)}`;

    const tmdbUrl = `${endpoint}?api_key=${TMDB_KEY}&language=en-US`;
    const r = await fetch(tmdbUrl);
    if (!r.ok) throw new Error(`TMDb failed: ${r.status}`);
    const data = await r.json();

    const title = isMovie ? data.title : data.name;
    const rating = typeof data.vote_average === "number" ? data.vote_average.toFixed(1) : "";
    const overview = (data.overview || "Find similar movies & TV shows fast.").trim();

    const posterPath = data.poster_path || "";
    const image = posterPath
      ? `https://image.tmdb.org/t/p/w780${posterPath}`
      : `https://${req.headers.host}/og.jpg`;

    const siteUrl = `https://${req.headers.host}`;
    const ogUrl = `${siteUrl}/t/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
    const appUrl = `${siteUrl}/?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;

    const ogTitle = title ? `Film Matrix — ${title}` : `Film Matrix`;
    const ogDesc = `${rating ? `⭐ ${rating} ` : ""}${overview}`.slice(0, 200);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDesc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}" />
</head>
<body></body>
</html>`);
  } catch (e) {
    res.status(500).send("Share preview error");
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
