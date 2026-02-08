// movies/api/similar.js
import { tmdb, normalizeMovie } from "./_tmdb.js";

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const minRating = Number(req.query.minRating || 0);
    const genre = String(req.query.genre || "any");
    const yearMin = Number(req.query.yearMin || 2000);
    const yearMax = Number(req.query.yearMax || 9999);

    // Get target details (for "why" + genre matching)
    const targetRaw = await tmdb(`/movie/${encodeURIComponent(id)}`, {});
    const target = normalizeMovie(targetRaw);

    // Similar list
    const simRaw = await tmdb(`/movie/${encodeURIComponent(id)}/similar`, { page: 1 });
    let items = (simRaw.results || []).map(normalizeMovie);

    // Filter year
    items = items.filter((m) => {
      const y = m.year || 0;
      return y >= yearMin && y <= yearMax;
    });

    // Filter rating
    items = items.filter((m) => (m.rating ?? 0) >= minRating);

    // Filter genre (if selected)
    if (genre !== "any" && genre !== "") {
      const g = Number(genre);
      items = items.filter((m) => Array.isArray(m.genres) && m.genres.includes(g));
    }

    // Add a simple "why" explanation
    items = items.slice(0, 20).map((m) => {
      const why = [];
      if (target.genres?.length && m.genres?.length) {
        const overlap = m.genres.filter((g) => target.genres.includes(g)).length;
        if (overlap) why.push(`genre overlap: ${overlap}`);
      }
      why.push("TMDb similar");
      return { ...m, why };
    });

    res.status(200).json({ target, results: items, similar: items });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || "Unknown error" });
  }
}
