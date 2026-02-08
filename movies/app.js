/* app.js — NEONSIMILAR (static frontend)
   Works with Vercel Serverless Functions:
   - /api/suggest?q=...
   - /api/search?q=...
   - /api/resolve?id=...
   - /api/similar?id=...&minRating=...&genre=...&yearMin=...&yearMax=...
   - /api/random?minRating=...&genre=...&yearMin=...&yearMax=...
*/

const els = {
  q: document.getElementById("q"),
  suggest: document.getElementById("suggest"),
  go: document.getElementById("go"),
  random: document.getElementById("random"),
  watchlist: document.getElementById("watchlist"),
  minRating: document.getElementById("minRating"),
  minRatingVal: document.getElementById("minRatingVal"),
  genre: document.getElementById("genre"),
  year: document.getElementById("year"),
  meta: document.getElementById("meta"),
  target: document.getElementById("target"),
  similar: document.getElementById("similar"),
};

// ALWAYS hit API at /api (do NOT prefix with /movies)
const API_BASE = "/api";

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function setMeta(msg, isError = false) {
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function clearResults() {
  els.similar.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
}

function getFilters() {
  const minRating = Number(els.minRating?.value || 0) || 0;
  const genre = els.genre?.value || "";
  const yearRaw = (els.year?.value || "").trim();

  let yearMin = "";
  let yearMax = "";
  if (yearRaw && yearRaw !== "Any") {
    const m = yearRaw.match(/^(\d{4})\+$/);
    if (m) {
      yearMin = m[1];
      yearMax = "";
    } else if (/^\d{4}$/.test(yearRaw)) {
      yearMin = yearRaw;
      yearMax = yearRaw;
    }
  }

  return { minRating, genre, yearMin, yearMax };
}

async function apiGet(path, params = {}) {
  // path examples: "search", "resolve", "similar", "random", "suggest"
  const url = new URL(`${location.origin}${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const text = await res.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text || "Invalid JSON" };
  }

  if (!res.ok) {
    const msg = json?.error || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

function renderTarget(m) {
  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    return;
  }

  const poster = m.poster
    ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />`
    : "";

  const genres = Array.isArray(m.genres) ? m.genres.join(", ") : "";
  const rating = (m.rating ?? "").toString();

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster}
      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">${esc(m.title)} <span class="muted">(${esc(m.year || "")})</span></div>
          <div class="pill">⭐ ${esc(rating || "—")}</div>
        </div>
        <div class="muted">${esc(genres)}</div>
        <div class="overview">${esc(m.overview || "")}</div>
      </div>
    </div>
  `;
}

function renderSimilar(items) {
  const list = (items || []).filter(Boolean);

  if (!list.length) {
    els.similar.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
    return;
  }

  els.similar.innerHTML = list.map((m) => {
    const title = esc(m.title || "Untitled");
    const year = esc(m.year || "");
    const rating = (m.rating ?? "").toString();
    return `
      <button class="chip" data-id="${esc(m.id)}" title="${esc(m.overview || "")}">
        <span class="chipTitle">${title} ${year ? `(${year})` : ""}</span>
        <span class="chipMeta">⭐ ${esc(rating || "—")}</span>
      </button>
    `;
  }).join("");

  els.similar.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      await loadById(id);
    });
  });
}

function renderSuggestions(items) {
  const list = (items || []).slice(0, 8);
  if (!list.length) {
    els.suggest.innerHTML = "";
    els.suggest.classList.add("hidden");
    return;
  }

  els.suggest.classList.remove("hidden");
  els.suggest.innerHTML = list.map((m) => `
    <button class="suggestItem" type="button" data-id="${esc(m.id)}">
      <span>${esc(m.title)}</span>
      <span class="muted">${esc(m.year || "")}</span>
    </button>
  `).join("");

  els.suggest.querySelectorAll(".suggestItem").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      els.suggest.classList.add("hidden");
      if (id) await loadById(id);
    });
  });
}

let suggestTimer = null;
async function onSuggestInput() {
  clearTimeout(suggestTimer);
  const q = (els.q.value || "").trim();
  if (q.length < 2) return renderSuggestions([]);

  suggestTimer = setTimeout(async () => {
    try {
      const data = await apiGet("suggest", { q });
      renderSuggestions(data.results || []);
    } catch {
      renderSuggestions([]);
    }
  }, 180);
}

async function loadById(id) {
  clearResults();
  setMeta("Loading…", false);

  try {
    // Resolve gives the full movie object for Target
    const target = await apiGet("resolve", { id });
    if (!target?.id) throw new Error("Resolve returned no id.");

    renderTarget(target);

    const f = getFilters();
    const sim = await apiGet("similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || []);
    setMeta(`Ready. Selected: ${target.title}`, false);
  } catch (e) {
    renderTarget(null);
    clearResults();
    setMeta(`Failed. (API ${e.status || "?"} — ${e.message})`, true);
  }
}

/**
 * FIXED SEARCH FLOW:
 * 1) /api/search?q=...  -> get items
 * 2) Take first result id
 * 3) /api/resolve?id=... -> FULL TARGET DETAILS
 * 4) /api/similar?id=... -> populate Similar
 */
async function runSearch(query) {
  const q = (query || "").trim();
  if (!q) return;

  clearResults();
  setMeta("Searching…", false);

  try {
    // Step 1 — search titles
    const data = await apiGet("search", { q });

    // Accept multiple possible shapes safely
    const first =
      (data.items && data.items[0]) ||
      (data.results && data.results[0]) ||
      data.target ||
      null;

    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    // Step 2 — resolve full movie (critical so Target always works)
    const target = await apiGet("resolve", { id: first.id });
    if (!target?.id) throw new Error("Resolve returned no id.");

    // Step 3 — render Target
    renderTarget(target);

    // Step 4 — Similar (now id always exists)
    const f = getFilters();
    const sim = await apiGet("similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || []);
    setMeta(`Ready. Selected: ${target.title}`, false);
  } catch (e) {
    renderTarget(null);
    clearResults();
    setMeta(`Failed. (API ${e.status || "?"} — ${e.message})`, true);
  }
}

async function runRandom() {
  clearResults();
  setMeta("Picking random…", false);

  try {
    const f = getFilters();
    const data = await apiGet("random", {
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    const target = data.target || null;
    if (!target?.id) throw new Error("Random returned no id.");

    // Resolve for full Target details
    const full = await apiGet("resolve", { id: target.id });
    renderTarget(full);

    const sim = await apiGet("similar", {
      id: full.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || []);
    setMeta(`Ready. Selected: ${full.title}`, false);
  } catch (e) {
    renderTarget(null);
    clearResults();
    setMeta(`Random failed. (API ${e.status || "?"} — ${e.message})`, true);
  }
}

function initUI() {
  if (els.minRating && els.minRatingVal) {
    const sync = () => (els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`);
    els.minRating.addEventListener("input", sync);
    sync();
  }

  els.q.addEventListener("input", onSuggestInput);
  els.q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch(els.q.value);
    }
  });

  els.go.addEventListener("click", () => runSearch(els.q.value));
  els.random.addEventListener("click", runRandom);

  document.addEventListener("click", (e) => {
    if (!els.suggest.contains(e.target) && e.target !== els.q) els.suggest.classList.add("hidden");
  });
}

// Boot
initUI();
renderTarget(null);
clearResults();
setMeta("Ready.", false);
