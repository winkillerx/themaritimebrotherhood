/* app.js — NEONSIMILAR (static frontend)
   Endpoints:
   - /api/suggest?q=...
   - /api/search?q=...
   - /api/resolve?id=...
   - /api/similar?id=...&minRating=...&genre=...&yearMin=1950
   - /api/random?minRating=...&genre=...&yearMin=1950
   - /api/videos?id=...   (NEW: trailer lookup)
*/

const YEAR_MIN = 1950;

const GENRES = [
  ["any", "Any"],
  [28, "Action"],
  [12, "Adventure"],
  [16, "Animation"],
  [35, "Comedy"],
  [80, "Crime"],
  [99, "Documentary"],
  [18, "Drama"],
  [10751, "Family"],
  [14, "Fantasy"],
  [36, "History"],
  [27, "Horror"],
  [10402, "Music"],
  [9648, "Mystery"],
  [10749, "Romance"],
  [878, "Sci-Fi"],
  [10770, "TV Movie"],
  [53, "Thriller"],
  [10752, "War"],
  [37, "Western"],
];

const genreNameById = new Map(
  GENRES.filter(([k]) => k !== "any").map(([id, name]) => [Number(id), name])
);

const els = {
  q: document.getElementById("q"),
  suggest: document.getElementById("suggest"),
  searchBtn: document.getElementById("go"),
  randomBtn: document.getElementById("random"),
  watchlistBtn: document.getElementById("watchlistBtn"),

  minRating: document.getElementById("minRating"),
  minRatingVal: document.getElementById("minRatingVal"),
  genre: document.getElementById("genre"),

  meta: document.getElementById("meta"),
  target: document.getElementById("target"),
  trailer: document.getElementById("trailer"),

  targetActions: document.getElementById("targetActions"),
  addWatch: document.getElementById("addWatch"),
  openImdb: document.getElementById("openImdb"),
  copyLink: document.getElementById("copyLink"),

  // IMPORTANT: Similar results container is #results in your HTML
  results: document.getElementById("results"),

  // Watchlist modal
  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  watchlist: document.getElementById("watchlist"),

  // Trailer modal (optional but supported)
  trailerModal: document.getElementById("trailerModal"),
  closeTrailer: document.getElementById("closeTrailer"),
  trailerTitle: document.getElementById("trailerTitle"),
  trailerFrame: document.getElementById("trailerFrame"),
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

function setMeta(msg, isError = false) {
  if (!els.meta) return;
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function getFilters() {
  const minRating = Number(els.minRating?.value || 0) || 0;
  const genre = String(els.genre?.value || "any").toLowerCase();
  return { minRating, genre };
}

function clearSimilar() {
  if (!els.results) return;
  els.results.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
}

function renderTarget(m) {
  // clear trailer area first (target trailer, not modal)
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
    : `<div class="poster placeholder"></div>`;

  // genres are TMDb IDs
  const genres = Array.isArray(m.genres)
    ? m.genres
        .map((g) => genreNameById.get(Number(g)) || "")
        .filter(Boolean)
        .join(", ")
    : "";

  const rating = (m.rating ?? "").toString();
  const year = m.year ? `(${esc(m.year)})` : "";

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

  els.targetActions?.classList.remove("hidden");

  // TMDb button
  els.openImdb && (els.openImdb.onclick = () => {
    window.open(`https://www.themoviedb.org/movie/${encodeURIComponent(m.id)}`, "_blank");
  });

  // Copy link button
  els.copyLink && (els.copyLink.onclick = async () => {
    try {
      const u = new URL(location.href);
      u.searchParams.set("id", String(m.id));
      await navigator.clipboard.writeText(u.toString());
      alert("Link copied ✅");
    } catch {
      alert("Copy failed (browser blocked clipboard).");
    }
  });

  // Watchlist
  els.addWatch && (els.addWatch.onclick = () => addToWatchlist(m));

  setMeta(`Ready. Selected: ${m.title}`, false);
}

/* ---------------- Trailer Support ---------------- */

async function getTrailerKey(id) {
  const data = await apiGet("/api/videos", { id });
  return data?.key || null;
}

function setTargetTrailer(key) {
  if (!els.trailer) return;

  if (!key) {
    els.trailer.classList.add("hidden");
    els.trailer.innerHTML = "";
    return;
  }

  const src = `https://www.youtube.com/embed/${encodeURIComponent(key)}?rel=0`;
  els.trailer.innerHTML = `
    <iframe
      loading="lazy"
      src="${src}"
      title="Trailer"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  `;
  els.trailer.classList.remove("hidden");
}

async function openTrailerModal(movie) {
  if (!els.trailerModal || !els.trailerFrame) return; // modal not installed => safely do nothing

  els.trailerTitle && (els.trailerTitle.textContent = movie?.title ? `${movie.title} — Trailer` : "Trailer");
  els.trailerFrame.innerHTML = `<div class="muted">Loading trailer…</div>`;
  els.trailerModal.classList.remove("hidden");

  try {
    const key = await getTrailerKey(movie.id);
    if (!key) {
      els.trailerFrame.innerHTML = `<div class="muted">No trailer found.</div>`;
      return;
    }

    const src = `https://www.youtube.com/embed/${encodeURIComponent(key)}?rel=0`;
    els.trailerFrame.innerHTML = `
      <iframe
        loading="lazy"
        src="${src}"
        title="Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  } catch {
    els.trailerFrame.innerHTML = `<div class="muted">Trailer failed to load.</div>`;
  }
}

function closeTrailerModal() {
  if (!els.trailerModal || !els.trailerFrame) return;
  els.trailerModal.classList.add("hidden");
  els.trailerFrame.innerHTML = "";
}

/* ---------------- Similar Rendering ---------------- */

function renderSimilar(items) {
  const list = (items || []).filter(Boolean);

  if (!els.results) return;

  if (!list.length) {
    clearSimilar();
    return;
  }

  // NOTE: use <div role="button"> so we can put a real <button> inside without nesting buttons
  let html = "";
  for (const m of list) {
    const title = esc(m.title || "Untitled");
    const year = m.year ? `(${esc(m.year)})` : "";
    const rating = (m.rating ?? "").toString();
    const overview = esc(m.overview || "");

    const poster = m.poster
      ? `<img class="poster" src="${esc(m.poster)}" alt="${title} poster" loading="lazy" />`
      : `<div class="poster placeholder"></div>`;

    html += `
      <div class="simCard" role="button" tabindex="0" data-id="${esc(m.id)}">
        <div class="targetGrid">
          ${poster}
          <div class="targetInfo">
            <div class="titleRow">
              <div class="title">${title} <span class="muted">${year}</span></div>
              <div class="pill">⭐ ${esc(rating || "—")}</div>
            </div>
            <div class="overview clamp3">${overview}</div>

            <div class="simActions">
              <button class="btn tiny trailerBtn" type="button" data-trailer="${esc(m.id)}">Trailer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  els.results.innerHTML = html;

  // Card click -> loadById
  const onCardActivate = (card) => {
    const id = card.getAttribute("data-id");
    if (id) loadById(id);
  };

  els.results.querySelectorAll(".simCard").forEach((card) => {
    card.addEventListener("click", () => onCardActivate(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCardActivate(card);
      }
    });
  });

  // Trailer button click -> modal trailer (does NOT trigger card click)
  els.results.querySelectorAll(".trailerBtn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const id = btn.getAttribute("data-trailer");
      if (!id) return;

      const movie = list.find((x) => String(x.id) === String(id)) || { id, title: "Trailer" };
      await openTrailerModal(movie);
    });
  });
}

/* ---------------- Suggestions ---------------- */

function renderSuggestions(items) {
  const list = (items || []).slice(0, 8);

  if (!els.suggest) return;

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
function onSuggestInput() {
  clearTimeout(suggestTimer);
  const q = (els.q?.value || "").trim();

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

/* ---------------- Load/Actions ---------------- */

async function loadById(id) {
  clearSimilar();
  setMeta("Loading…", false);

  try {
    // Resolve gives canonical movie details
    const r = await apiGet("/api/resolve", { id });
    const target = r.target || r;
    if (!target?.id) throw new Error("Resolve did not return a target id.");

    renderTarget(target);

    // Target trailer (non-blocking)
    try {
      const key = await getTrailerKey(target.id);
      setTargetTrailer(key);
    } catch {
      setTargetTrailer(null);
    }

    // Similar
    const f = getFilters();
    const sim = await apiGet("/api/similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN,
    });

    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

async function doSearch() {
  const q = (els.q?.value || "").trim();
  if (!q) return;

  clearSimilar();
  setMeta("Searching…", false);

  try {
    const data = await apiGet("/api/search", { q });
    const first = data?.target || (data?.items && data.items[0]) || (data?.results && data.results[0]) || null;

    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    await loadById(first.id);
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
      yearMin: YEAR_MIN,
    });

    const target = data?.target || null;
    if (!target?.id) {
      renderTarget(null);
      setMeta("Random failed (no target).", true);
      return;
    }

    await loadById(target.id);
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* ---------------- Watchlist ---------------- */

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

function openWatchlist() {
  if (!els.watchlist || !els.modal) return;

  const list = loadWatchlist();
  els.watchlist.innerHTML = list.length
    ? list.map((m) => `
        <div class="watchItem">
          ${m.poster ? `<img class="watchPoster" src="${esc(m.poster)}" alt="" />` : ""}
          <div>
            <div><strong>${esc(m.title || "")}</strong> <span class="muted">${esc(m.year || "")}</span></div>
            <div class="watchMeta">⭐ ${esc((m.rating ?? "—").toString())}</div>
          </div>
        </div>
      `).join("")
    : `<div class="muted">No watchlist items yet.</div>`;

  els.modal.classList.remove("hidden");
}

function closeWatchlist() {
  els.modal?.classList.add("hidden");
}

/* ---------------- UI Init ---------------- */

function initUI() {
  // Populate genre dropdown
  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) => `<option value="${esc(val)}">${esc(name)}</option>`).join("");
  }

  // Rating slider label
  if (els.minRating && els.minRatingVal) {
    const sync = () => (els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`);
    els.minRating.addEventListener("input", sync);
    sync();
  }

  // Search box events
  els.q?.addEventListener("input", onSuggestInput);
  els.q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  els.searchBtn?.addEventListener("click", doSearch);
  els.randomBtn?.addEventListener("click", doRandom);

  // Hide suggestions when tapping elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // Watchlist modal
  els.watchlistBtn?.addEventListener("click", openWatchlist);
  els.closeModal?.addEventListener("click", closeWatchlist);
  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) closeWatchlist();
  });

  // Trailer modal (optional)
  els.closeTrailer?.addEventListener("click", closeTrailerModal);
  els.trailerModal?.addEventListener("click", (e) => {
    if (e.target === els.trailerModal) closeTrailerModal();
  });

  // If user comes in with ?id=123, load it
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (id) loadById(id);
}

// Boot
initUI();
renderTarget(null);
clearSimilar();
setMeta("Ready.", false);
