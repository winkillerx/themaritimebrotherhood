// api/share.js
// Generates OG/Twitter tags for /t/:type/:id preview links (Vercel Serverless Function)

export default async function handler(req, res) {
  try {
    const { id, type } = req.query;

    if (!id || !type) return res.status(400).send("Missing id/type");

    const isMovie = type === "movie";
    const isTv = type === "tv";
    if (!isMovie && !isTv) return res.status(400).send("Invalid type");

    // ✅ accept either env var name
    const TMDB_KEY = process.env.TMDB_KEY || process.env.TMDB_API_KEY;
    if (!TMDB_KEY) return res.status(500).send("Missing TMDB_KEY env var");

    const endpoint = isMovie
      ? `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}`
      : `https://api.themoviedb.org/3/tv/${encodeURIComponent(id)}`;

    const tmdbUrl = `${endpoint}?api_key=${TMDB_KEY}&language=en-US`;
    const r = await fetch(tmdbUrl);
    if (!r.ok) {
      // helpful error for debugging (kept short)
      return res.status(502).send(`TMDb failed: ${r.status}`);
    }

    const data = await r.json();

    const title = isMovie ? data.title : data.name;

    // ✅ year (movie release_date / tv first_air_date)
    const dateStr = isMovie ? data.release_date : data.first_air_date;
    const year = (dateStr || "").slice(0, 4);

    // ✅ rating (only if valid)
    const rating =
      typeof data.vote_average === "number" && data.vote_average > 0
        ? data.vote_average.toFixed(1)
        : "";

    const overview = (data.overview || "Find similar movies & TV shows fast.")
      .replace(/\s+/g, " ")
      .trim();

    // Use a big poster for social preview
    const posterPath = data.poster_path || "";
    const image = posterPath
      ? `https://image.tmdb.org/t/p/w780${posterPath}`
      : `https://${req.headers.host}/og.jpg`;

    const siteUrl = `https://${req.headers.host}`;
    const ogUrl = `${siteUrl}/t/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;

    // What humans should land on (your SPA target view)
    const appUrl = `${siteUrl}/?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;

    // ✅ iMessage often shows ONLY title + image.
    // Pack year + rating + a short snippet into og:title to increase chance it appears.
    const shortOverview = overview.slice(0, 90);
    const ratingBit = rating ? `⭐ ${rating}/10` : "";
    const yearBit = year ? `(${year})` : "";

    const ogTitle = title
      ? `${title} ${yearBit}${ratingBit ? ` • ${ratingBit}` : ""}${shortOverview ? ` — ${shortOverview}` : ""}`
      : "Film Matrix";

    // Keep og:description too (used by many platforms)
    const ogDesc = `${ratingBit ? `${ratingBit} • ` : ""}${overview}`.slice(0, 200);

    // Detect bots (so we don't auto-redirect them)
    const ua = String(req.headers["user-agent"] || "").toLowerCase();
    const isBot =
      ua.includes("facebookexternalhit") ||
      ua.includes("twitterbot") ||
      ua.includes("slackbot") ||
      ua.includes("discordbot") ||
      ua.includes("whatsapp") ||
      ua.includes("telegrambot") ||
      ua.includes("linkedinbot") ||
      ua.includes("embedly") ||
      ua.includes("pinterest") ||
      ua.includes("applebot"); // sometimes helps with Apple previews

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, max-age=0");

    res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Basic -->
  <meta name="description" content="${escapeHtml(ogDesc)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Film Matrix" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDesc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- Redirect real users into the app (bots should NOT redirect) -->
  ${isBot ? "" : `<script>location.replace(${JSON.stringify(appUrl)});</script>`}
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
