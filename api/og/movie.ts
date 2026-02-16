import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdb = searchParams.get("id");

  if (!imdb) {
    return new Response("Missing id", { status: 400 });
  }

  // 🔑 Fetch from TMDb (via IMDb ID)
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/find/${imdb}?external_source=imdb_id&api_key=${process.env.TMDB_API_KEY}`
  );

  const data = await tmdbRes.json();
  const movie = data.movie_results?.[0] || data.tv_results?.[0];

  if (!movie) {
    return new Response("Not found", { status: 404 });
  }

  const title = movie.title || movie.name;
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : "https://filmmatrix.net/og.jpg";

  const redirectUrl = `https://filmmatrix.net/?id=${movie.id}&type=${movie.title ? "movie" : "tv"}`;

  return new Response(
    `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta property="og:type" content="video.movie">
<meta property="og:title" content="${title} (${year})">
<meta property="og:description" content="Find movies similar to ${title}">
<meta property="og:image" content="${poster}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://filmmatrix.net/movie/${imdb}">
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
</head>
<body></body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }
  );
}
