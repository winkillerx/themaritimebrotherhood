// api/_tmdb.js
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

// size can be: w500, w780, original, etc.
export function posterUrl(movie, size = "w500") {
  return movie.poster_path ? `https://image.tmdb.org/t/p/${size}${movie.poster_path}` : "";
}

export function normalizeMovie(movie) {
  // If this came from /movie/:id, it has `genres: [{id,name}]`
  const genreNames =
    Array.isArray(movie.genres) ? movie.genres.map(g => g?.name).filter(Boolean) : null;

  // If this came from /search/movie or /similar, it has `genre_ids: [id]`
  const genreIds =
    Array.isArray(movie.genre_ids) ? movie.genre_ids : [];

  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    year: pickYear(movie),
    rating: typeof movie.vote_average === "number" ? movie.vote_average : null,
    overview: movie.overview || "",
    poster: posterUrl(movie, "w500"),
    posterLarge: posterUrl(movie, "w780"),
    posterOriginal: posterUrl(movie, "original"),
    // Prefer real names when available; fallback to ids
    genres: genreNames && genreNames.length ? genreNames : genreIds,
  };
}
