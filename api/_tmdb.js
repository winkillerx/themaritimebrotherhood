// api/_tmdb.js
// Shared TMDb helper (supports multiple env var names)

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

function getKey() {
  return (
    process.env.TMDB_KEY ||
    process.env.TMDB_API_KEY ||      // ✅ fallback
    process.env.TMDB_V3_KEY ||       // ✅ fallback
    process.env.TMDB_TOKEN ||        // (if someone named it this)
    ""
  );
}

export async function tmdb(path, params = {}) {
  const key = getKey();
  if (!key) throw new Error("TMDb API key missing. Set TMDB_KEY (or TMDB_API_KEY) in Vercel env.");

  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text || "Invalid JSON from TMDb" };
  }

  if (!res.ok) {
    const msg = json?.status_message || json?.error || `${res.status} ${res.statusText}`;
    throw new Error(`TMDb error: ${msg}`);
  }

  return json;
}

export function posterUrl(path) {
  return path ? `${IMG_BASE}${path}` : "";
}

// Normalizes either movie or tv item into your frontend shape
export function normalizeAny(item, typeOverride) {
  if (!item) return null;

  const type = typeOverride || item.media_type || (item.first_air_date ? "tv" : "movie");
  const title = type === "tv" ? item.name : item.title;
  const date = type === "tv" ? item.first_air_date : item.release_date;

  return {
    id: item.id,
    type,
    title: title || "Untitled",
    year: date ? String(date).slice(0, 4) : "",
    rating: typeof item.vote_average === "number" ? item.vote_average : null,
    poster: posterUrl(item.poster_path),
    overview: item.overview || "",
    genres: Array.isArray(item.genre_ids) ? item.genre_ids : [],
  };
}
