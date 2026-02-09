// api/similar.js
import { tmdb, normalizeAny } from "./_tmdb.js";

const YEAR_MIN = 1950;

function uniqByIdType(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const k = `${x.type}:${x.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function scoreItem(x, targetGenres = []) {
  const rating = typeof x.rating === "number" ? x.rating : 0;
  const g = Array.isArray(x.genres) ? x.genres.map(Number) : [];
  const overlap = targetGenres.length ? g.filter(id => targetGenres.includes(id)).length : 0;
  return rating + overlap * 0.75;
}

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    const type = String(req.query.type || "movie").trim().toLowerCase(); // movie | tv
    const minRating = Number(req.query.minRating || 0) || 0;
    const genre = String(req.query.genre || "any").trim().toLowerCase(); // "any" or numeric id

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type !== "movie" && type !== "tv") return res.status(400).json({ error: "Invalid type" });

    const target = await tmdb(`/${type}/${id}`);
    const targetGenres = (target.genres || []).map(g => Number(g.id)).filter(Boolean);

    const [rec, sim] = await Promise.all([
      tmdb(`/${type}/${id}/recommendations`, { page: 1 }).catch(() => ({ results: [] })),
      tmdb(`/${type}/${id}/similar`, { page: 1 }).catch(() => ({ results: [] })),
    ]);

    let items = [...(rec.results || []), ...(sim.results || [])]
      .map(x => normalizeAny(x, type))
      .filter(x => (x.year ? x.year >= YEAR_MIN : true))
      .filter(x => (typeof x.rating === "number" ? x.rating >= minRating : true));

    if (genre !== "any" && genre !== "") {
      const gId = Number(genre);
      if (Number.isFinite(gId)) {
        items = items.filter(x => Array.isArray(x.genres) && x.genres.map(Number).includes(gId));
      }
    }

    items = uniqByIdType(items);
    items.sort((a, b) => scoreItem(b, targetGenres) - scoreItem(a, targetGenres));
    items = items.slice(0, 20);

    return res.status(200).json({
      target: normalizeAny(target, type),
      similar: items,
      results: items
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
