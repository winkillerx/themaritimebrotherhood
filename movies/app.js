/* app.js — NEONSIMILAR (static frontend)
   Works with Vercel Serverless Functions:
   - /api/suggest?q=...
   - /api/search?q=...
   - /api/resolve?id=...
   - /api/similar?id=...&minRating=...&genre=...&yearMin=...&yearMax=...
   - /api/random?minRating=...&genre=...&yearMin=...&yearMax=...
*/

const els = {
  // inputs
  q: document.getElementById("q"),
  suggest: document.getElementById("suggest"),

  // buttons (MATCH index.html)
  searchBtn: document.getElementById("go"),
  randomBtn: document.getElementById("random"),
  watchlistBtn: document.getElementById("watchlistBtn"),

  // filters
  minRating: document.getElementById("minRating"),
  minRatingVal: document.getElementById("minRatingVal"),
  genre: document.getElementById("genre"),
  year: document.getElementById("year"),

  // output
  meta: document.getElementById("meta"),
  target: document.getElementById("target"),
  similar: document.getElementById("similar"),

  // target actions (MATCH index.html)
  targetActions: document.getElementById("targetActions"),
  addWatch: document.getElementById("addWatch"),
  openTmdb: document.getElementById("openImdb"), // button label says IMDb, but we’ll open TMDB

  // modal (MATCH index.html)
  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  watchlist: document.getElementById("watchlist"),
};

const API_BASE = ""; // API lives at /api

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function apiGet(path, params = {}) {
  const url = new URL(`${location.origin}${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const text = await res.text();

  let json;
  try { json = text ? JSON.parse(text) : {}; }
  catch { json = { error: text || "Invalid JSON" }; }

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
  if (!els.meta) return;
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function renderTarget(m) {
  if (!els.target) return;

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    if (els.targetActions) els.targetActions.classList.add("hidden");
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

  if (els.targetActions) els.targetActions.classList.remove("hidden");

  if (els.openTmdb) {
    els.openTmdb.onclick = () =>
      window.open(`https://www.themoviedb.org/movie/${encodeURIComponent(m.id)}`, "_blank");
  }

  if (els.addWatch) {
    els.addWatch.onclick = () => addToWatchlist(m);
  }
}

function renderSimilar(items) {
  if (!els.similar) return;

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
      <button class="chip" type="button" data-id="${esc(m.id)}" title="${esc(m.overview || "")}">
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
  if (!els.suggest) return;

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
      if (els.suggest) els.suggest.classList.add("hidden");
      if (id) await loadById(id);
    });
  });
}

function clearResults() {
  if (els.similar) {
    els.similar.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
  }
}

let suggestTimer = null;
async function onSuggestInput() {
  clearTimeout(suggestTimer);

  const q = (els.q?.value || "").trim();
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
    // Resolve full movie details
    const target = await apiGet("/api/resolve", { id });
    renderTarget(target);

    // Then fetch similar using the resolved ID + filters
    const f = getFilters();
    const sim = await apiGet("/api/similar", {
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
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doSearch() {
  const q = (els.q?.value || "").trim();
  if (!q) return;

  clearResults();
  setMeta("Searching…", false);

  try {
    // Step 1: search list
    const data = await apiGet("/api/search", { q });
    const first = (data.items && data.items[0]) || null;

    if (!first) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    // Step 2: resolve details (critical)
    await loadById(first.id);
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
    const data = await apiGet("/api/random", {
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    const target = data.target || null;
    if (!target) {
      renderTarget(null);
      setMeta("Random failed (no target).", true);
      return;
    }

    await loadById(target.id);
  } catch (e) {
    renderTarget(null);
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* Watchlist (localStorage) */
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
  if (list.some((x) => String(x.id) === String(m.id))) return;

  list.unshift({
    id: m.id,
    title: m.title,
    year: m.year,
    rating: m.rating,
    poster: m.poster,
  });

  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function renderWatchlist() {
  if (!els.watchlist) return;

  const list = loadWatchlist();
  if (!list.length) {
    els.watchlist.innerHTML = `<div class="muted">Your watchlist is empty.</div>`;
    return;
  }

  els.watchlist.innerHTML = list.map((m) => `
    <div class="wlItem">
      ${m.poster ? `<img class="wlPoster" src="${esc(m.poster)}" alt="" />` : ""}
      <div class="wlInfo">
        <div class="wlTitle">${esc(m.title)} <span class="muted">${esc(m.year || "")}</span></div>
        <div class="muted">⭐ ${esc((m.rating ?? "—").toString())}</div>
        <div class="wlBtns">
          <button class="wlOpen" type="button" data-id="${esc(m.id)}">Open</button>
          <button class="wlRemove" type="button" data-id="${esc(m.id)}">Remove</button>
        </div>
      </div>
    </div>
  `).join("");

  els.watchlist.querySelectorAll(".wlOpen").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      closeModal();
      await loadById(id);
    });
  });

  els.watchlist.querySelectorAll(".wlRemove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      const next = loadWatchlist().filter((x) => String(x.id) !== String(id));
      saveWatchlist(next);
      renderWatchlist();
    });
  });
}

function openModal() {
  if (!els.modal) return;
  els.modal.classList.remove("hidden");
  renderWatchlist();
}

function closeModal() {
  if (!els.modal) return;
  els.modal.classList.add("hidden");
}

/* Init */
function initUI() {
  // rating display
  if (els.minRating && els.minRatingVal) {
    const sync = () => (els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`);
    els.minRating.addEventListener("input", sync);
    sync();
  }

  // suggest + enter
  if (els.q) {
    els.q.addEventListener("input", onSuggestInput);
    els.q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
  }

  // buttons
  if (els.searchBtn) els.searchBtn.addEventListener("click", doSearch);
  if (els.randomBtn) els.randomBtn.addEventListener("click", doRandom);

  // watchlist modal
  if (els.watchlistBtn) els.watchlistBtn.addEventListener("click", openModal);
  if (els.closeModal) els.closeModal.addEventListener("click", closeModal);

  // close when clicking outside content
  if (els.modal) {
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
  }

  // hide suggest on outside click
  document.addEventListener("click", (e) => {
    if (!els.suggest || !els.q) return;
    if (!els.suggest.contains(e.target) && e.target !== els.q) {
      els.suggest.classList.add("hidden");
    }
  });
}

initUI();
renderTarget(null);
clearResults();
setMeta("Ready.", false);
