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
  searchBtn: document.getElementById("go"),
  randomBtn: document.getElementById("random"),
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
  openImdb: document.getElementById("openImdb"), // button label might say IMDB, we’ll open TMDb (we have TMDb id)
  copyLink: document.getElementById("copyLink"),

  similar: document.getElementById("similar"),
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
  const genre = String(els.genre?.value || "any").toLowerCase();
  const yearRaw = (els.year?.value || "").trim();

  let yearMin = "";
  let yearMax = "";

  // Default your UI shows "2000+"
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

function clearSimilar() {
  if (!els.similar) return;
  els.similar.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
}

function renderTarget(m) {
  if (els.trailer) {
    els.trailer.classList.add("hidden");
    els.trailer.innerHTML = "";
  }

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions?.classList.add("hidden");
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

  if (els.openImdb) {
    els.openImdb.onclick = () => {
      // We have TMDb ids; open TMDb reliably
      window.open(`https://www.themoviedb.org/movie/${encodeURIComponent(m.id)}`, "_blank");
    };
  }

  if (els.copyLink) {
    els.copyLink.onclick = async () => {
      try {
        const u = new URL(location.href);
        u.searchParams.set("id", String(m.id));
        await navigator.clipboard.writeText(u.toString());
        alert("Link copied ✅");
      } catch {
        alert("Copy failed (browser blocked clipboard).");
      }
    };
  }

  if (els.addWatch) els.addWatch.onclick = () => addToWatchlist(m);

  setMeta(`Ready. Selected: ${m.title}`, false);
}

function renderSimilar(items) {
  const list = (items || []).filter(Boolean);

  if (!list.length) {
    clearSimilar();
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

  // ✅ click handlers
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

  if (q.length < 2) {
    renderSuggestions([]);
    return;
  }

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
  clearSimilar();
  setMeta("Loading…", false);

  try {
    const r = await apiGet("/api/resolve", { id });
    const target = r.target || r; // resolve returns {target:...}
    if (!target?.id) throw new Error("Resolve did not return a target id.");

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
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doSearch() {
  const q = (els.q.value || "").trim();
  if (!q) return;

  clearSimilar();
  setMeta("Searching…", false);

  try {
    // 1) search titles
    const data = await apiGet("/api/search", { q });

    // Support both shapes: {items:[...]} and {results:[...]}
    const list = data.items || data.results || [];
    const first = data.target || list[0] || null;

    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    // 2) resolve for full details (genres, etc.)
    const r = await apiGet("/api/resolve", { id: first.id });
    const target = r.target || r;

    if (!target?.id) {
      renderTarget(null);
      setMeta("Resolve failed (missing id).", true);
      return;
    }

    // 3) render target
    renderTarget(target);

    // 4) fetch similar (now id is guaranteed)
    const f = getFilters();
    const sim = await apiGet("/api/similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doRandom() {
  clearSimilar();
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
    if (!target?.id) {
      renderTarget(null);
      setMeta("Random failed (no target).", true);
      return;
    }

    renderTarget(target);

    const sim = await apiGet("/api/similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* Watchlist */
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
  list.unshift({ id: m.id, title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function initUI() {
  if (els.minRating && els.minRatingVal) {
    const sync = () => (els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`);
    els.minRating.addEventListener("input", sync);
    sync();
  }

  els.q?.addEventListener("input", onSuggestInput);
  els.q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  els.searchBtn?.addEventListener("click", doSearch);
  els.randomBtn?.addEventListener("click", doRandom);

  // hide suggestions when tapping elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // If user comes in with ?id=123 load it
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (id) loadById(id);
}

initUI();
renderTarget(null);
clearSimilar();
setMeta("Ready.", false);
