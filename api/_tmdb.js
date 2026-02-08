// movies/api/_tmdb.js
export function mustGetKey() {
  const k = process.env.TMDB_KEY;
  if (!k) {
    const err = new Error("Missing TMDB_KEY env var in Vercel.");
    err.statusCode = 500;
    throw err;
  }
  return k;
}

export async function tmdb(path, params = {}) {
  const key = mustGetKey();
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`TMDb error ${res.status}: ${txt}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

export function pickYear(movie) {
  const d = movie.release_date || movie.first_air_date || "";
  const y = d ? Number(d.slice(0, 4)) : null;
  return Number.isFinite(y) ? y : null;
}

export function posterUrl(movie) {
  return movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "";
}

export function normalizeMovie(movie) {
  const genreIds = Array.isArray(movie.genre_ids) ? movie.genre_ids : [];
  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    year: pickYear(movie),
    rating: typeof movie.vote_average === "number" ? movie.vote_average : null,
    overview: movie.overview || "",
    poster: posterUrl(movie),
    genres: genreIds, // ids for now; resolve.js should convert to names
  };
}
