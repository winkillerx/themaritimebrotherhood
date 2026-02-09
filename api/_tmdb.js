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

export function pickYear(item) {
  const d = item.release_date || item.first_air_date || "";
  const y = d ? Number(String(d).slice(0, 4)) : null;
  return Number.isFinite(y) ? y : null;
}

export function posterUrl(item) {
  return item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
}

export function normalizeAny(item, forcedType = "") {
  const mediaType = forcedType || item.media_type || (item.first_air_date ? "tv" : "movie");
  const isTv = mediaType === "tv";
  return {
    id: item.id,
    type: isTv ? "tv" : "movie",
    title: (isTv ? (item.name || item.original_name) : (item.title || item.original_title)) || "Untitled",
    year: pickYear(item),
    rating: typeof item.vote_average === "number" ? item.vote_average : null,
    overview: item.overview || "",
    poster: posterUrl(item),
    genres: item.genre_ids || item.genres?.map(g => g.id) || [],
  };
}
