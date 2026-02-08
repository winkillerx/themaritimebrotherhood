/* app.js — NEONSIMILAR (fixed for /movies subpath + visible error messages) */

const $ = (s) => document.querySelector(s);
const el = {
  q: $("#q"),
  suggest: $("#suggest"),
  go: $("#go"),
  random: $("#random"),
  results: $("#results"),
  target: $("#target"),
  trailerBtn: $("#trailer"),
  meta: $("#meta"),
  minRating: $("#minRating"),
  minRatingVal: $("#minRatingVal"),
  genre: $("#genre"),
  year: $("#year"),

  targetActions: $("#targetActions"),
  addWatch: $("#addWatch"),
  copyLink: $("#copyLink"),
  openImdb: $("#openImdb"),

  watchlistBtn: $("#watchlistBtn"),
  modal: $("#modal"),
  closeModal: $("#closeModal"),
  watchlist: $("#watchlist"),
};

let state = {
  target: null,
  similar: [],
  lastQuery: "",
  lastSuggest: [],
};

// --- IMPORTANT FIX: support deploying under /movies ---
const API_BASE = window.location.pathname.startsWith("/movies") ? "/movies" : "";

// optional: show where we think we are (helps debugging)
function setMeta(msg) {
  if (!el.meta) return;
  el.meta.textContent = msg || "";
}

function setError(msg) {
  setMeta(`⚠️ ${msg}`);
}

async function api(url, opts = {}) {
  // If you call /api/..., we prefix /movies when needed.
  const finalUrl = url.startsWith("/api") ? `${API_BASE}${url}` : url;

  const res = await fetch(finalUrl, {
    method: "GET",
    ...opts,
    headers: {
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`);
  }
  return res.json();
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ratingText(r) {
  if (r == null) return "—";
  return `${Number(r).toFixed(1)}/10`;
}

function yearOk(y) {
  const v = String(y || "");
  if (v === "2000+") return { min: 2000, max: 9999 };
  if (/^\d{4}$/.test(v)) return { min: Number(v), max: Number(v) };
  if (/^\d{4}\s*-\s*\d{4}$/.test(v)) {
    const [a, b] = v.split("-").map((x) => Number(x.trim()));
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  return { min: 2000, max: 9999 };
}

function readFilters() {
  const minRating = Number(el.minRating?.value || 0);
  const genre = String(el.genre?.value || "any");
  const yr = yearOk(el.year?.value || "2000+");
  return { minRating, genre, yearMin: yr.min, yearMax: yr.max };
}

// ---- UI: suggestions ----
let suggestTimer = null;

function renderSuggest(items) {
  if (!el.suggest) return;
  el.suggest.innerHTML = "";

  if (!items || !items.length) return;

  for (const it of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "suggestRow";
    row.innerHTML = `
      <span class="sTitle">${escapeHtml(it.title || it.name || "Untitled")}</span>
      <span class="sYear">${escapeHtml(it.year ? String(it.year) : "")}</span>
    `;
    row.addEventListener("click", () => {
      el.q.value = it.title || it.name || "";
      el.suggest.innerHTML = "";
      pickTarget(it);
    });
    el.suggest.appendChild(row);
  }
}

async function doSuggest() {
  const q = (el.q?.value || "").trim();
  state.lastQuery = q;

  if (!q || q.length < 2) {
    renderSuggest([]);
    return;
  }

  try {
    const data = await api(`/api/suggest?q=${encodeURIComponent(q)}`);
    // expected: { results: [...] }
    const items = (data && (data.results || data.items)) || [];
    state.lastSuggest = items;
    // Only render if user hasn’t changed the query mid-request
    if ((el.q?.value || "").trim() === q) renderSuggest(items.slice(0, 8));
    setMeta(`Ready. (${API_BASE || "/"} deployed)`);
  } catch (e) {
    renderSuggest([]);
    setError(`Suggest failed. Check Vercel env + routes. (${e.message})`);
  }
}

// ---- Target + Similar ----
function renderTarget(t) {
  if (!el.target) return;

  if (!t) {
    el.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    el.targetActions?.classList.add("hidden");
    return;
  }

  el.targetActions?.classList.remove("hidden");

  const poster = t.poster ? `<img class="poster" src="${escapeHtml(t.poster)}" alt="">` : "";
  el.target.innerHTML = `
    <div class="targetCard">
      ${poster}
      <div class="tInfo">
        <div class="tTitle">${escapeHtml(t.title || "Untitled")}</div>
        <div class="tMeta">
          <span>${escapeHtml(t.year ? String(t.year) : "")}</span>
          <span class="dot">•</span>
          <span>${escapeHtml(ratingText(t.rating))}</span>
          ${t.genres?.length ? `<span class="dot">•</span><span>${escapeHtml(t.genres.slice(0, 3).join(", "))}</span>` : ""}
        </div>
        <div class="tOverview">${escapeHtml(t.overview || "")}</div>
        <div class="tBtns">
          <button id="trailerInline" class="btnGhost" type="button">Trailer</button>
        </div>
      </div>
    </div>
  `;

  const trailerInline = $("#trailerInline");
  if (trailerInline) {
    trailerInline.addEventListener("click", () => openTrailer(t));
  }
}

function renderSimilar(items) {
  if (!el.results) return;

  el.results.innerHTML = "";

  if (!items || !items.length) {
    el.results.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
    return;
  }

  for (const it of items) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "resultCard";
    card.innerHTML = `
      <div class="rTitle">${escapeHtml(it.title || "Untitled")}</div>
      <div class="rMeta">
        <span>${escapeHtml(it.year ? String(it.year) : "")}</span>
        <span class="dot">•</span>
        <span>${escapeHtml(ratingText(it.rating))}</span>
        ${it.why?.length ? `<span class="dot">•</span><span class="why">${escapeHtml(it.why.join(" • "))}</span>` : ""}
      </div>
    `;

    card.addEventListener("click", () => pickTarget(it));
    el.results.appendChild(card);
  }
}

async function pickTarget(baseMovie) {
  try {
    state.target = baseMovie;
    renderTarget(baseMovie);
    setMeta("Finding similar titles…");

    const f = readFilters();
    const id = baseMovie.id || baseMovie.tmdbId || baseMovie.imdbId || "";
    if (!id) {
      setError("This title has no ID from the API. Try searching again and selecting from suggestions.");
      return;
    }

    const data = await api(
      `/api/similar?id=${encodeURIComponent(id)}&minRating=${encodeURIComponent(f.minRating)}&genre=${encodeURIComponent(
        f.genre
      )}&yearMin=${encodeURIComponent(f.yearMin)}&yearMax=${encodeURIComponent(f.yearMax)}`
    );

    const items = (data && (data.results || data.items || data.similar)) || [];
    state.similar = items;

    renderSimilar(items);
    setMeta(`Loaded ${items.length} similar results.`);
  } catch (e) {
    renderSimilar([]);
    setError(`Similar search failed. (${e.message})`);
  }
}

// ---- Search button (manual) ----
async function doSearch() {
  const q = (el.q?.value || "").trim();
  if (!q) {
    setError("Type a movie title first.");
    return;
  }

  renderSuggest([]); // hide dropdown
  setMeta("Searching…");

  try {
    const f = readFilters();
    const data = await api(
      `/api/search?q=${encodeURIComponent(q)}&minRating=${encodeURIComponent(f.minRating)}&genre=${encodeURIComponent(
        f.genre
      )}&yearMin=${encodeURIComponent(f.yearMin)}&yearMax=${encodeURIComponent(f.yearMax)}`
    );

    // expected: { target, results } or { items }
    const target = data.target || (data.results && data.results[0]) || (data.items && data.items[0]) || null;
    const items = data.results || data.items || [];

    if (!target) {
      renderTarget(null);
      renderSimilar([]);
      setError("No match found. Try typing a full title (e.g., “Blade (1998)”).");
      return;
    }

    state.target = target;
    renderTarget(target);

    // If backend already returned similar list, show it
    const similar = data.similar || data.more || items.filter((x) => x.id !== target.id);
    state.similar = similar;

    renderSimilar(similar);
    setMeta(`Done. ${similar.length} results.`);
  } catch (e) {
    renderTarget(null);
    renderSimilar([]);
    setError(`Search failed. (${e.message})`);
  }
}

// ---- Trailer ----
function openTrailer(t) {
  if (!t) return;

  // If API provides trailer URL, use it; otherwise fallback to YouTube search.
  const url =
    t.trailerUrl ||
    (t.trailerKey ? `https://www.youtube.com/embed/${t.trailerKey}` : null) ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent((t.title || "") + " trailer")}`;

  if (url.includes("youtube.com/embed/")) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ---- Watchlist ----
const WL_KEY = "neonsimilar_watchlist_v1";

function loadWL() {
  try {
    return JSON.parse(localStorage.getItem(WL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveWL(list) {
  localStorage.setItem(WL_KEY, JSON.stringify(list));
}

function addToWL(m) {
  if (!m) return;
  const wl = loadWL();
  const id = m.id || m.tmdbId || m.imdbId || `${m.title}-${m.year}`;
  if (wl.some((x) => (x.id || x.tmdbId || x.imdbId) === id)) return;
  wl.unshift({ ...m, _savedAt: Date.now() });
  saveWL(wl);
  setMeta("Added to Watchlist (saved on this device).");
}

function openWL() {
  const wl = loadWL();
  if (!el.watchlist) return;

  el.watchlist.innerHTML = "";
  if (!wl.length) {
    el.watchlist.innerHTML = `<div class="muted">Watchlist is empty.</div>`;
  } else {
    for (const it of wl) {
      const row = document.createElement("div");
      row.className = "wlRow";
      row.innerHTML = `
        <div class="wlTitle">${escapeHtml(it.title || "Untitled")}</div>
        <div class="wlMeta">${escapeHtml(it.year ? String(it.year) : "")} • ${escapeHtml(ratingText(it.rating))}</div>
        <button class="wlUse" type="button">Use</button>
      `;
      row.querySelector(".wlUse").addEventListener("click", () => {
        closeModal();
        pickTarget(it);
      });
      el.watchlist.appendChild(row);
    }
  }
  openModal();
}

function openModal() {
  el.modal?.classList.add("open");
}
function closeModal() {
  el.modal?.classList.remove("open");
}

// ---- Share / IMDb ----
async function copyShareLink() {
  const t = state.target;
  if (!t) return setError("Pick a target first.");

  const base = `${location.origin}${location.pathname.replace(/\/index\.html$/, "/")}`;
  const id = t.id || t.tmdbId || t.imdbId || "";
  const share = `${base}?m=${encodeURIComponent(id)}`;

  try {
    await navigator.clipboard.writeText(share);
    setMeta("Copied share link ✅");
  } catch {
    setError("Could not copy link (iOS Safari sometimes blocks clipboard).");
  }
}

function openImdb() {
  const t = state.target;
  if (!t) return setError("Pick a target first.");
  if (t.imdbId) {
    window.open(`https://www.imdb.com/title/${t.imdbId}/`, "_blank", "noopener,noreferrer");
  } else {
    // fallback search
    window.open(
      `https://www.imdb.com/find/?q=${encodeURIComponent(`${t.title || ""} ${t.year || ""}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}

// ---- Random ----
async function doRandom() {
  setMeta("Picking a random movie…");
  try {
    const f = readFilters();
    const data = await api(
      `/api/random?minRating=${encodeURIComponent(f.minRating)}&genre=${encodeURIComponent(
        f.genre
      )}&yearMin=${encodeURIComponent(f.yearMin)}&yearMax=${encodeURIComponent(f.yearMax)}`
    );

    const t = data.target || data.movie || data.item || null;
    if (!t) return setError("Random returned nothing. Try again.");

    pickTarget(t);
  } catch (e) {
    setError(`Random failed. (${e.message})`);
  }
}

// ---- Init / Events ----
function bind() {
  // live slider label
  if (el.minRating && el.minRatingVal) {
    const upd = () => (el.minRatingVal.textContent = `${el.minRating.value}/10`);
    el.minRating.addEventListener("input", upd);
    upd();
  }

  // Suggestions typing
  if (el.q) {
    el.q.addEventListener("input", () => {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(doSuggest, 180);
    });

    el.q.addEventListener("focus", () => {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(doSuggest, 50);
    });
  }

  // Search button
  el.go?.addEventListener("click", doSearch);

  // Random
  el.random?.addEventListener("click", doRandom);

  // Actions
  el.addWatch?.addEventListener("click", () => addToWL(state.target));
  el.copyLink?.addEventListener("click", copyShareLink);
  el.openImdb?.addEventListener("click", openImdb);
  el.watchlistBtn?.addEventListener("click", openWL);

  // Modal close
  el.closeModal?.addEventListener("click", closeModal);
  el.modal?.addEventListener("click", (e) => {
    if (e.target === el.modal) closeModal();
  });

  // If user hits enter in the input, do search
  el.q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  // Load from share link ?m=
  const params = new URLSearchParams(location.search);
  const m = params.get("m");
  if (m) {
    // Let backend resolve whatever ID it is
    (async () => {
      try {
        setMeta("Loading shared title…");
        const data = await api(`/api/resolve?id=${encodeURIComponent(m)}`);
        const t = data.target || data.movie || data.item || null;
        if (t) pickTarget(t);
        else setError("Could not resolve shared link.");
      } catch (e) {
        setError(`Share resolve failed. (${e.message})`);
      }
    })();
  } else {
    setMeta(`Ready. (${API_BASE || "/"} deployed)`);
  }
}

bind();
