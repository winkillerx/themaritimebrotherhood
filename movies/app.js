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
  searchBtn: document.getElementById("searchBtn"),
  randomBtn: document.getElementById("randomBtn"),
  watchlistBtn: document.getElementById("watchlistBtn"),
  minRating: document.getElementById("minRating"),
  minRatingVal: document.getElementById("minRatingVal"),
  genre: document.getElementById("genre"),
  year: document.getElementById("year"),
  meta: document.getElementById("meta"),
  target: document.getElementById("target"),
  trailer: document.getElementById("trailer"),
  targetActions: document.getElementById("targetActions"),
  addWatch: document.getElementById("addWatch"),
  openTmdb: document.getElementById("openTmdb"),
  openTrailer: document.getElementById("openTrailer"),
  results: document.getElementById("results"),
  similar: document.getElementById("similar"),
};

const API_BASE = ""; // IMPORTANT: API lives at /api (do NOT prefix with /movies)

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function apiGet(path, params = {}) {
  const url = new URL(`${location.origin}${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text || "Invalid JSON" }; }

  if (!res.ok) {
    const msg = json?.error || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
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

function setMeta(msg, isError = false) {
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function renderTarget(m) {
  els.trailer.classList.add("hidden");
  els.trailer.innerHTML = "";

  if (!m) {
    els.target.classList.remove("hidden");
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions.classList.add("hidden");
    setMeta("No selection yet.", false);
    return;
  }

  const poster = m.poster ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />` : "";
  const genres = Array.isArray(m.genres) ? m.genres.join(", ") : "";
  const rating = (m.rating ?? "").toString();

  els.target.classList.remove("hidden");
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

  els.targetActions.classList.remove("hidden");
  els.openTmdb.onclick = () => window.open(`https://www.themoviedb.org/movie/${encodeURIComponent(m.id)}`, "_blank");
  els.addWatch.onclick = () => addToWatchlist(m);
  els.openTrailer.onclick = async () => {
    try {
      const data = await apiGet("/api/tmdb", { path: `/movie/${m.id}/videos` });
      const vids = data?.results || [];
      const yt = vids.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) || vids.find(v => v.site === "YouTube");
      if (!yt) return alert("No trailer found.");
      const src = `https://www.youtube.com/embed/${encodeURIComponent(yt.key)}`;
      els.trailer.innerHTML = `<iframe loading="lazy" src="${src}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      els.trailer.classList.remove("hidden");
    } catch (e) {
      alert(`Trailer failed: ${e.message}`);
    }
  };

  setMeta(`Ready. Selected: ${m.title}`, false);
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

  els.similar.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      await loadById(id);
    });
  });
}

function clearResults() {
  els.results.innerHTML = "";
  els.similar.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
}

function renderSuggestions(items) {
  const list = (items || []).slice(0, 8);
  if (!list.length) {
    els.suggest.innerHTML = "";
    els.suggest.classList.add("hidden");
    return;
  }
  els.suggest.classList.remove("hidden");
  els.suggest.innerHTML = list.map(m => `
    <button class="suggestItem" type="button" data-id="${esc(m.id)}">
      <span>${esc(m.title)}</span>
      <span class="muted">${esc(m.year || "")}</span>
    </button>
  `).join("");

  els.suggest.querySelectorAll(".suggestItem").forEach(b => {
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
      const data = await apiGet("/api/suggest", { q });
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
    const target = await apiGet("/api/resolve", { id });
    renderTarget(target);

    const f = getFilters();
    const sim = await apiGet("/api/similar", { id: target.id, minRating: f.minRating, genre: f.genre, yearMin: f.yearMin, yearMax: f.yearMax });
    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    setMeta(`Search failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doSearch() {
  const q = (els.q.value || "").trim();
  if (!q) return;

  clearResults();
  setMeta("Searching…", false);

  try {
    const data = await apiGet("/api/search", { q });
    const target = data.target || (data.items && data.items[0]) || null;
    renderTarget(target);

    if (!target) {
      setMeta("No match found.", true);
      return;
    }

    const f = getFilters();
    const sim = await apiGet("/api/similar", { id: target.id, minRating: f.minRating, genre: f.genre, yearMin: f.yearMin, yearMax: f.yearMax });
    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    setMeta(`Search failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doRandom() {
  clearResults();
  setMeta("Picking random…", false);
  try {
    const f = getFilters();
    const data = await apiGet("/api/random", { minRating: f.minRating, genre: f.genre, yearMin: f.yearMin, yearMax: f.yearMax });
    const target = data.target || null;
    renderTarget(target);

    if (!target) {
      setMeta("Random failed (no target).", true);
      return;
    }

    const sim = await apiGet("/api/similar", { id: target.id, minRating: f.minRating, genre: f.genre, yearMin: f.yearMin, yearMax: f.yearMax });
    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

const WL_KEY = "neonsimilar_watchlist_v1";
function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || "[]"); }
  catch { return []; }
}
function saveWatchlist(items) {
  localStorage.setItem(WL_KEY, JSON.stringify(items.slice(0, 200)));
}
function addToWatchlist(m) {
  if (!m) return;
  const list = loadWatchlist();
  if (list.some(x => String(x.id) === String(m.id))) return;
  list.unshift({ id: m.id, title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function initUI() {
  if (els.minRating && els.minRatingVal) {
    const sync = () => els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`;
    els.minRating.addEventListener("input", sync);
    sync();
  }

  els.q.addEventListener("input", onSuggestInput);
  els.q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
  els.searchBtn.addEventListener("click", doSearch);
  els.randomBtn.addEventListener("click", doRandom);

  document.addEventListener("click", (e) => {
    if (!els.suggest.contains(e.target) && e.target !== els.q) els.suggest.classList.add("hidden");
  });
}
initUI();
