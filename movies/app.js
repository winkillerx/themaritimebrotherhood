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
  trailer: document.getElementById("trailer"),

  openImdb: document.getElementById("openImdb"),
  copyLink: document.getElementById("copyLink"),
  addWatch: document.getElementById("addWatch"),

  // NOTE: In your HTML, “Similar” list lives inside #results
  results: document.getElementById("results"),

  // Watchlist modal bits (exist in your HTML)
  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  watchlistBody: document.getElementById("watchlistBody"),
  clearWatch: document.getElementById("clearWatch"),
};

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function apiGet(path, params = {}) {
  const url = new URL(`${location.origin}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const text = await res.text();

  let json = {};
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

function setMeta(msg, isError = false) {
  if (!els.meta) return;
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function getFilters() {
  const minRating = Number(els.minRating?.value || 0) || 0;
  const genre = els.genre?.value || "any";
  const yearRaw = (els.year?.value || "2000+").trim();

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

function passesClientFilters(m, f) {
  if (!m) return false;

  const rating = Number(m.rating ?? 0) || 0;
  if (rating < (Number(f.minRating) || 0)) return false;

  // year filter
  const y = Number(m.year ?? 0) || 0;
  if (f.yearMin) {
    const minY = Number(f.yearMin) || 0;
    if (y && y < minY) return false;
  }
  if (f.yearMax) {
    const maxY = Number(f.yearMax) || 9999;
    if (y && y > maxY) return false;
  }

  // genre filter
  // Your API returns genres as numeric IDs array, and your dropdown uses numeric values.
  if (f.genre && f.genre !== "any" && f.genre !== "Any") {
    const g = Number(f.genre);
    const arr = Array.isArray(m.genres) ? m.genres : [];
    if (!arr.map(Number).includes(g)) return false;
  }

  return true;
}

function clearResults() {
  if (els.results) {
    els.results.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
  }
}

function renderTarget(m) {
  if (!els.target) return;

  // reset trailer
  if (els.trailer) {
    els.trailer.classList.add("hidden");
    els.trailer.innerHTML = "";
  }

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    if (els.openImdb) els.openImdb.onclick = null;
    if (els.copyLink) els.copyLink.onclick = null;
    if (els.addWatch) els.addWatch.onclick = null;
    return;
  }

  const poster = m.poster
    ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />`
    : "";

  const rating = (m.rating ?? "").toString();
  const year = m.year ? `(${esc(m.year)})` : "";
  const genres = Array.isArray(m.genres) ? m.genres.join(", ") : "";

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster}
      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">${esc(m.title)} <span class="muted">${year}</span></div>
          <div class="pill">⭐ ${esc(rating || "—")}</div>
        </div>
        <div class="muted">${esc(genres)}</div>
        <div class="overview">${esc(m.overview || "")}</div>
      </div>
    </div>
  `;

  // Buttons in your HTML are named openImdb/copyLink but we’ll use TMDb links.
  if (els.openImdb) {
    els.openImdb.onclick = () =>
      window.open(`https://www.themoviedb.org/movie/${encodeURIComponent(m.id)}`, "_blank");
  }

  if (els.copyLink) {
    els.copyLink.onclick = async () => {
      const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(m.id)}`;
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied ✅");
      } catch {
        prompt("Copy this link:", url);
      }
    };
  }

  if (els.addWatch) {
    els.addWatch.onclick = () => addToWatchlist(m);
  }
}

function renderSimilar(list) {
  const f = getFilters();
  const items = (list || []).filter(Boolean).filter(m => passesClientFilters(m, f));

  if (!items.length) {
    clearResults();
    return;
  }

  // Render chips into #results (this is your “Similar” box)
  els.results.innerHTML = items.map((m) => {
    const title = esc(m.title || "Untitled");
    const year = m.year ? `(${esc(m.year)})` : "";
    const rating = (m.rating ?? "").toString();
    return `
      <button class="chip" data-id="${esc(m.id)}" title="${esc(m.overview || "")}">
        <span class="chipTitle">${title} ${year}</span>
        <span class="chipMeta">⭐ ${esc(rating || "—")}</span>
      </button>
    `;
  }).join("");

  els.results.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      await loadById(id);
    });
  });
}

function showSuggestions(list) {
  const items = (list || []).slice(0, 8);
  if (!els.suggest) return;

  if (!items.length) {
    els.suggest.innerHTML = "";
    els.suggest.classList.add("hidden");
    return;
  }

  els.suggest.classList.remove("hidden");
  els.suggest.innerHTML = items.map(m => `
    <button class="suggestItem" type="button" data-id="${esc(m.id)}">
      <span>${esc(m.title)}</span>
      <span class="muted">${esc(m.year || "")}</span>
    </button>
  `).join("");

  els.suggest.querySelectorAll(".suggestItem").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      els.suggest.classList.add("hidden");
      if (id) await loadById(id);
    });
  });
}

let suggestTimer = null;
function onSuggestInput() {
  clearTimeout(suggestTimer);
  const q = (els.q?.value || "").trim();
  if (q.length < 2) return showSuggestions([]);

  suggestTimer = setTimeout(async () => {
    try {
      const data = await apiGet("/api/suggest", { q });
      showSuggestions(data.results || []);
    } catch {
      showSuggestions([]);
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
    clearResults();
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doSearch() {
  const q = (els.q?.value || "").trim();
  if (!q) return;

  clearResults();
  setMeta("Searching…", false);

  try {
    // IMPORTANT: your backend /api/search already returns { target, similar, items }
    const data = await apiGet("/api/search", { q });

    const target = data.target || (data.items && data.items[0]) || null;
    renderTarget(target);

    if (!target) {
      clearResults();
      setMeta("No match found.", true);
      return;
    }

    // Use the similar list returned by /api/search (fast path)
    const sim = data.similar || data.results || [];
    renderSimilar(sim);

    setMeta(`Ready. Selected: ${target.title}`, false);
  } catch (e) {
    renderTarget(null);
    clearResults();
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
    renderTarget(target);

    if (!target) {
      clearResults();
      setMeta("Random failed (no target).", true);
      return;
    }

    // Prefer server-provided similar if present; otherwise call /api/similar
    if (Array.isArray(data.similar) && data.similar.length) {
      renderSimilar(data.similar);
    } else {
      const sim = await apiGet("/api/similar", {
        id: target.id,
        minRating: f.minRating,
        genre: f.genre,
        yearMin: f.yearMin,
        yearMax: f.yearMax,
      });
      renderSimilar(sim.similar || sim.results || []);
    }

    setMeta(`Ready. Selected: ${target.title}`, false);
  } catch (e) {
    renderTarget(null);
    clearResults();
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* Watchlist (modal) */
const WL_KEY = "neonsimilar_watchlist_v1";

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || "[]"); }
  catch { return []; }
}

function saveWatchlist(list) {
  localStorage.setItem(WL_KEY, JSON.stringify(list.slice(0, 200)));
}

function addToWatchlist(m) {
  if (!m) return;
  const list = loadWatchlist();
  if (list.some(x => String(x.id) === String(m.id))) {
    alert("Already in Watchlist ✅");
    return;
  }
  list.unshift({ id: m.id, title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function renderWatchlistModal() {
  if (!els.watchlistBody) return;
  const list = loadWatchlist();

  if (!list.length) {
    els.watchlistBody.innerHTML = `<div class="muted">Your watchlist is empty.</div>`;
    return;
  }

  els.watchlistBody.innerHTML = list.map(m => `
    <button class="suggestItem" type="button" data-id="${esc(m.id)}">
      <span>${esc(m.title)}</span>
      <span class="muted">${esc(m.year || "")}</span>
    </button>
  `).join("");

  els.watchlistBody.querySelectorAll(".suggestItem").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      closeModal();
      if (id) await loadById(id);
    });
  });
}

function openModal() {
  if (!els.modal) return;
  renderWatchlistModal();
  els.modal.classList.remove("hidden");
}

function closeModal() {
  if (!els.modal) return;
  els.modal.classList.add("hidden");
}

function initUI() {
  // slider label
  if (els.minRating && els.minRatingVal) {
    const sync = () => els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`;
    els.minRating.addEventListener("input", sync);
    sync();
  }

  // suggestions
  if (els.q) {
    els.q.addEventListener("input", onSuggestInput);
    els.q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
    });
  }

  // buttons
  if (els.go) els.go.addEventListener("click", doSearch);
  if (els.random) els.random.addEventListener("click", doRandom);

  // hide suggest if click outside
  document.addEventListener("click", (e) => {
    if (els.suggest && els.q && !els.suggest.contains(e.target) && e.target !== els.q) {
      els.suggest.classList.add("hidden");
    }
  });

  // watchlist modal
  if (els.watchlist) els.watchlist.addEventListener("click", openModal);
  if (els.closeModal) els.closeModal.addEventListener("click", closeModal);
  if (els.modal) {
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
  }
  if (els.clearWatch) {
    els.clearWatch.addEventListener("click", () => {
      if (!confirm("Clear watchlist?")) return;
      saveWatchlist([]);
      renderWatchlistModal();
    });
  }

  // load by URL ?id=...
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (id) loadById(id);
}

initUI();
renderTarget(null);
clearResults();
setMeta("Ready.", false);
