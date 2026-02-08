import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We are already INSIDE /movies, so serve this folder
app.use("/", express.static(__dirname));

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const PORT = process.env.PORT || 8080;

if (!TMDB_API_KEY) {
  console.error("Missing TMDB_API_KEY in .env");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbUrl(endpoint, params = {}) {
  const u = new URL(TMDB_BASE + endpoint);
  u.searchParams.set("api_key", TMDB_API_KEY);
  u.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function tmdbFetch(endpoint, params) {
  const res = await fetch(tmdbUrl(endpoint, params));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ---- API ROUTES ---- */

app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  const data = await tmdbFetch("/search/movie", { query: q });
  const filtered = data.results.filter(m => {
    const y = (m.release_date || "").slice(0,4);
    return y && Number(y) >= 2000;
  });
  res.json({ results: filtered });
});

app.get("/api/movie/:id", async (req, res) => {
  const data = await tmdbFetch(`/movie/${req.params.id}`, {});
  res.json(data);
});

app.get("/api/movie/:id/similar", async (req, res) => {
  const data = await tmdbFetch(`/movie/${req.params.id}/similar`, {});
  const filtered = data.results.filter(m => {
    const y = (m.release_date || "").slice(0,4);
    return y && Number(y) >= 2000;
  });
  res.json({ results: filtered });
});

app.get("/api/movie/:id/videos", async (req, res) => {
  const data = await tmdbFetch(`/movie/${req.params.id}/videos`, {});
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  res.json({ trailer });
});

app.get("/api/movie/:id/external_ids", async (req, res) => {
  const data = await tmdbFetch(`/movie/${req.params.id}/external_ids`, {});
  res.json(data);
});

app.get("/api/genres", async (req, res) => {
  const data = await tmdbFetch("/genre/movie/list", {});
  res.json(data);
});

app.get("/api/random", async (req, res) => {
  const page = Math.floor(Math.random()*20)+1;
  const data = await tmdbFetch("/movie/popular", { page });
  const filtered = data.results.filter(m => {
    const y = (m.release_date || "").slice(0,4);
    return y && Number(y) >= 2000;
  });
  res.json(filtered[Math.floor(Math.random()*filtered.length)]);
});

/* ---- START ---- */

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
