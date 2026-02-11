/* app.js — FILM_MATRIX (static frontend)
   Endpoints expected:
   - /api/suggest?q=...
   - /api/search?q=...
   - /api/resolve?id=...&type=movie|tv
   - /api/similar?id=...&type=movie|tv&minRating=...&genre=...&yearMin=...
   - /api/videos?id=...&type=movie|tv   => { key: "YouTubeKey" }
   - Popular:
     - /api/popular?page=N => { movies:[...], tv:[...] }

   Notes:
   ✅ Random is CLIENT-SIDE using Popular cache (because /api/random returns 500)
   ✅ Popular loads 50 movies + 50 tv (multi-page)
*/

const YEAR_MIN = 1950;
const POPULAR_COUNT = 50; // ✅ 50 each

const GENRES = [
  ["any", "Any"],
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Sci-Fi"],
  [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
  [10759, "Action & Adventure"], [10762, "Kids"], [10763, "News"], [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"], [10766, "Soap"], [10767, "Talk"], [10768, "War & Politics"],
];

const genreNameById = new Map(
  GENRES.filter(([k]) => k !== "any").map(([id, name]) => [Number(id), name])
);

const els = {
  q: document.getElementById("q"),
  suggest: document.getElementById("suggest"),
  searchBtn: document.getElementById("go"),

  watchlistBtn: document.getElementById("watchlistBtn"),
  randomBtn: document.getElementById("random"),
  tvOnlyBtn: document.getElementById("tvOnlyBtn"),
  movieOnlyBtn: document.getElementById("movieOnlyBtn"),

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

  results: document.getElementById("results"),
  matches: document.getElementById("matches"),

  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  watchlist: document.getElementById("watchlist"),

  popularMovies: document.getElementById("popularMovies"),
  popularTv: document.getElementById("popularTv") || document.getElementById("popularTV"),
};

const API_BASE = "";

/* -----------------------------
   Mode / highlighting
------------------------------*/
let activeMode = "none"; // none | random | tv | movie | watchlist
let mediaFilter = "any"; // any | tv | movie

function setActiveMode(mode) {
  activeMode = mode;
  [els.watchlistBtn, els.randomBtn, els.tvOnlyBtn, els.movieOnlyBtn].forEach((b) => b?.classList.remove("active"));

  if (mode === "watchlist") els.watchlistBtn?.classList.add("active");
  if (mode === "random") els.randomBtn?.classList.add("active");
  if (mode === "tv") els.tvOnlyBtn?.classList.add("active");
  if (mode === "movie") els.movieOnlyBtn?.classList.add("active");
}

function asType(x, fallback = "movie") {
  const t = String(x || fallback).toLowerCase();
  return t === "tv" ? "tv" : "movie";
}

function safeUpper(x) {
  return String(x || "").toUpperCase();
}

/* -----------------------------
   Helpers
------------------------------*/
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtRating(r) {
  const n = Number(r);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function fmtYear(y) {
  return y ? `(${esc(y)})` : "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setMeta(msg, isError = false) {
  if (!els.meta) return;
  els.meta.textContent = msg;
  els.meta.classList.toggle("muted", !isError);
  els.meta.classList.toggle("warn", isError);
}

function getFilters() {
  const minRating = Number(els.minRating?.value || 0) || 0;
  const genre = String(els.genre?.value || "any").trim().toLowerCase();
  return { minRating, genre };
}

function clearLists() {
  if (els.results) els.results.innerHTML = `<div class="muted">No similar titles found (try another title).</div>`;
  if (els.matches) {
    els.matches.innerHTML = "";
    els.matches.classList.add("hidden");
  }
}

/* -----------------------------
   apiGet with timeout (prevents “stuck Loading…”)
------------------------------*/
async function apiGet(path, params = {}, timeoutMs = 12000) {
  const url = new URL(`${location.origin}${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res, text;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }

  let json;
  try { json = text ? JSON.parse(text) : {}; }
  catch { json = { error: text || "Invalid JSON" }; }

  if (!res.ok) {
    let msg = json?.error ?? json?.message ?? `${res.status} ${res.statusText}`;
    if (typeof msg === "object") {
      try { msg = JSON.stringify(msg); } catch { msg = "Server error"; }
    }
    const err = new Error(String(msg));
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

/* -----------------------------
   Trailer helpers
------------------------------*/
function renderTrailerEmbed(key) {
  if (!els.trailer) return;
  if (!key) {
    els.trailer.classList.add("hidden");
    els.trailer.innerHTML = "";
    return;
  }
  const src = `https://www.youtube.com/embed/${encodeURIComponent(key)}`;
  els.trailer.innerHTML =
    `<iframe loading="lazy" src="${src}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  els.trailer.classList.remove("hidden");
}

async function fetchTrailerKey(id, type) {
  const data = await apiGet("/api/videos", { id, type: asType(type) });
  return data?.key || "";
}

/* -----------------------------
   Read-more toggle (shared)
------------------------------*/
function makeReadMoreHTML(fullText = "", clampLines = 4) {
  const t = String(fullText || "").trim();
  if (!t) return { html: `<div class="overviewText muted">No description available.</div>`, hasToggle: false };

  const safe = esc(t);
  // Always clamp visually; toggle reveals full
  return {
    html: `
      <div class="overviewText clamp" style="--clamp:${clampLines}" data-full="${safe}">${safe}</div>
      <button class="btn linkBtn readMoreBtn" type="button">Read more</button>
    `,
    hasToggle: true
  };
}

function wireReadMore(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".readMoreBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest(".overviewBlock");
      const textEl = box?.querySelector(".overviewText");
      if (!textEl) return;

      const expanded = textEl.classList.toggle("expanded");
      btn.textContent = expanded ? "Show less" : "Read more";
    });
  });
}

/* -----------------------------
   Render Target
   ✅ title row + rating
   ✅ genres BELOW title row (left)
   ✅ overview UNDER poster area + spacing
------------------------------*/
function renderTarget(m) {
  if (!els.target) return;
  renderTrailerEmbed("");

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions?.classList.add("hidden");
    setMeta("Ready.", false);
    return;
  }

  const type = asType(m.type, "movie");

  const poster = m.poster
    ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />`
    : `<div class="poster placeholder"></div>`;

  const genres = Array.isArray(m.genres)
    ? m.genres.map((g) => genreNameById.get(Number(g)) || "").filter(Boolean).join(", ")
    : "";

  const overviewBits = makeReadMoreHTML(m.overview || "", 5);

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster}

      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
          <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
        </div>

        <div class="genresRow">
          <div class="genresText">${esc(genres || "—")}</div>
          <div class="typeText muted">${esc(safeUpper(type))}</div>
        </div>
      </div>

      <div class="overviewBlock">
        ${overviewBits.html}
      </div>
    </div>
  `;

  wireReadMore(els.target);

  els.targetActions?.classList.remove("hidden");

  els.openImdb && (els.openImdb.onclick = () => {
    window.open(`https://www.themoviedb.org/${type}/${encodeURIComponent(m.id)}`, "_blank");
  });

  els.copyLink && (els.copyLink.onclick = async () => {
    try {
      const u = new URL(location.href);
      u.searchParams.set("id", String(m.id));
      u.searchParams.set("type", type);
      await navigator.clipboard.writeText(u.toString());
      alert("Link copied ✅");
    } catch {
      alert("Copy failed (browser blocked clipboard).");
    }
  });

  els.addWatch && (els.addWatch.onclick = () => addToWatchlist({ ...m, type }));

  (async () => {
    try {
      const key = m.trailerKey || await fetchTrailerKey(m.id, type);
      renderTrailerEmbed(key);
    } catch {
      renderTrailerEmbed("");
    }
  })();

  setMeta(`Selected: ${m.title}`, false);
}

/* -----------------------------
   Render Similar
   ✅ genres below title
   ✅ overview under poster area
   ✅ read more toggle per card
   ✅ centered buttons
------------------------------*/
function renderSimilar(items) {
  const list = (items || []).filter(Boolean).slice(0, 20);
  if (!els.results) return;

  if (!list.length) {
    els.results.innerHTML = `<div class="muted">No similar titles found (try another title).</div>`;
    return;
  }

  els.results.innerHTML = list.map((m) => {
    const type = asType(m.type, "movie");

    const poster = m.poster
      ? `<img class="poster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
      : `<div class="poster placeholder"></div>`;

    const genres = Array.isArray(m.genres)
      ? m.genres.map((g) => genreNameById.get(Number(g)) || "").filter(Boolean).slice(0, 4).join(", ")
      : "";

    const overviewBits = makeReadMoreHTML(m.overview || "", 4);

    return `
      <div class="simCard" data-id="${esc(m.id)}" data-type="${esc(type)}">
        <div class="targetGrid">
          ${poster}

          <div class="targetInfo">
            <div class="titleRow">
              <div class="title">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
              <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
            </div>

            <div class="genresRow">
              <div class="genresText">${esc(genres || "—")}</div>
              <div class="typeText muted">${esc(safeUpper(type))}</div>
            </div>
          </div>

          <div class="overviewBlock">
            ${overviewBits.html}

            <div class="simActions">
              <button class="btn sm openBtn" type="button">Open</button>
              <button class="btn sm trailerBtn" type="button">Trailer</button>
              <button class="btn sm tmdbBtn" type="button">TMDb</button>
            </div>

            <div class="miniTrailer hidden"></div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Read more wiring
  wireReadMore(els.results);

  // Card wiring
  els.results.querySelectorAll(".simCard").forEach((card) => {
    const id = card.getAttribute("data-id");
    const type = asType(card.getAttribute("data-type") || "movie", "movie");

    const openBtn = card.querySelector(".openBtn");
    const trailerBtn = card.querySelector(".trailerBtn");
    const tmdbBtn = card.querySelector(".tmdbBtn");
    const mini = card.querySelector(".miniTrailer");

    openBtn?.addEventListener("click", () => loadById(id, type));
    tmdbBtn?.addEventListener("click", () =>
      window.open(`https://www.themoviedb.org/${type}/${encodeURIComponent(id)}`, "_blank")
    );

    trailerBtn?.addEventListener("click", async () => {
      try {
        trailerBtn.disabled = true;
        const showing = !mini.classList.contains("hidden");

        if (showing) {
          mini.classList.add("hidden");
          mini.innerHTML = "";
          trailerBtn.textContent = "Trailer";
          return;
        }

        trailerBtn.textContent = "Loading…";
        const key = await fetchTrailerKey(id, type);

        if (!key) {
          alert("No trailer found.");
          trailerBtn.textContent = "Trailer";
          return;
        }

        mini.innerHTML =
          `<iframe loading="lazy" src="https://www.youtube.com/embed/${encodeURIComponent(key)}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        mini.classList.remove("hidden");
        trailerBtn.textContent = "Hide trailer";
      } catch (e) {
        alert(`Trailer failed: ${e.message}`);
        trailerBtn.textContent = "Trailer";
      } finally {
        trailerBtn.disabled = false;
      }
    });
  });
}

/* -----------------------------
   Suggestions
------------------------------*/
function renderSuggestions(items) {
  const list = (items || []).slice(0, 10);
  if (!els.suggest) return;

  if (!list.length) {
    els.suggest.innerHTML = "";
    els.suggest.classList.add("hidden");
    return;
  }

  els.suggest.classList.remove("hidden");
  els.suggest.innerHTML = list.map((m) => {
    const type = asType(m.type, "movie");
    return `
      <button class="suggestItem" type="button" data-id="${esc(m.id)}" data-type="${esc(type)}">
        <span>${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
        <span class="muted">${esc(safeUpper(type))}</span>
      </button>
    `;
  }).join("");

  els.suggest.querySelectorAll(".suggestItem").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      const type = asType(b.getAttribute("data-type") || "movie", "movie");
      els.suggest.classList.add("hidden");
      if (id) await loadById(id, type);
    });
  });
}

/* -----------------------------
   Search matches (chips)
------------------------------*/
function renderMatches(items) {
  if (!els.matches) return;

  const filtered = (items || []).filter(Boolean).filter((m) => {
    if (mediaFilter === "any") return true;
    return asType(m.type, "movie") === mediaFilter;
  });

  const list = filtered.slice(0, 10);

  if (!list.length) {
    els.matches.innerHTML = "";
    els.matches.classList.add("hidden");
    return;
  }

  els.matches.classList.remove("hidden");
  els.matches.innerHTML = list.map((m) => {
    const type = asType(m.type, "movie");
    return `
      <button class="chip" type="button" data-id="${esc(m.id)}" data-type="${esc(type)}">
        <span class="chipTitle">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
        <span class="chipMeta">${esc(safeUpper(type))} • ⭐ ${esc(fmtRating(m.rating))}</span>
      </button>
    `;
  }).join("");

  els.matches.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const type = asType(btn.getAttribute("data-type") || "movie", "movie");
      if (id) loadById(id, type);
    });
  });
}

/* -----------------------------
   Suggest input handler
------------------------------*/
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
      const raw = data.results || data.items || [];
      const filtered = raw.filter((m) => {
        if (mediaFilter === "any") return true;
        return asType(m.type, "movie") === mediaFilter;
      });
      renderSuggestions(filtered);
    } catch {
      renderSuggestions([]);
    }
  }, 160);
}

/* -----------------------------
   Core: Load by id
------------------------------*/
async function loadById(id, type = "movie") {
  clearLists();
  setMeta("Loading…", false);

  try {
    const t = asType(type, "movie");
    const r = await apiGet("/api/resolve", { id, type: t });
    const target = r.target || r;
    if (!target?.id) throw new Error("Resolve did not return a target id.");

    const targetType = asType(target.type || t, t);
    renderTarget({ ...target, type: targetType });

    const f = getFilters();
    const sim = await apiGet("/api/similar", {
      id: target.id,
      type: targetType,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN
    });

    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    clearLists();
    setMeta(`Failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* -----------------------------
   Search
------------------------------*/
async function doSearch() {
  const q = (els.q?.value || "").trim();
  if (!q) return;

  clearLists();
  setMeta("Searching…", false);

  try {
    const data = await apiGet("/api/search", { q });
    const items = data.items || data.results || [];

    renderMatches(items);

    const filtered = items.filter((m) => {
      if (mediaFilter === "any") return true;
      return asType(m.type, "movie") === mediaFilter;
    });

    const first = data.target || filtered[0] || null;
    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    await loadById(first.id, asType(first.type, "movie"));
  } catch (e) {
    renderTarget(null);
    clearLists();
    setMeta(`Search failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* -----------------------------
   Watchlist
------------------------------*/
const WL_KEY = "filmmatrix_watchlist_v2";

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || "[]"); }
  catch { return []; }
}

function saveWatchlist(items) {
  localStorage.setItem(WL_KEY, JSON.stringify(items.slice(0, 200)));
}

function addToWatchlist(m) {
  if (!m) return;
  const type = asType(m.type, "movie");
  const list = loadWatchlist();
  if (list.some((x) => String(x.id) === String(m.id) && asType(x.type, "movie") === type)) return;
  list.unshift({ id: m.id, type, title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function openWatchlist() {
  const list = loadWatchlist();
  if (!els.watchlist) return;

  els.watchlist.innerHTML = list.length
    ? list.map((m) => {
        const type = asType(m.type, "movie");
        return `
          <div class="watchItem">
            ${m.poster ? `<img class="watchPoster" src="${esc(m.poster)}" alt="" />` : ""}
            <div>
              <div>
                <strong>${esc(m.title || "")}</strong>
                <span class="muted"> ${fmtYear(m.year)}</span>
                <span class="muted"> (${esc(safeUpper(type))})</span>
              </div>
              <div class="watchMeta">⭐ ${esc(fmtRating(m.rating))}</div>
              <div style="margin-top:8px">
                <button class="btn sm" type="button" data-id="${esc(m.id)}" data-type="${esc(type)}">Open</button>
              </div>
            </div>
          </div>
        `;
      }).join("")
    : `<div class="muted">No watchlist items yet.</div>`;

  els.watchlist.querySelectorAll("button[data-id]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const type = asType(b.getAttribute("data-type") || "movie", "movie");
      closeWatchlist();
      loadById(id, type);
    });
  });

  els.modal?.classList.remove("hidden");
}

function closeWatchlist() {
  els.modal?.classList.add("hidden");
}

/* -----------------------------
   ✅ Popular Now (50 + 50)
   Uses /api/popular?page=1..N
------------------------------*/
let popularCache = { movies: [], tv: [] };
let popularLoadedOnce = false;

async function fetchPopularPagesTo50() {
  const moviesOut = [];
  const tvOut = [];

  // TMDb popular is typically 20 per page; 3 pages = 60 -> enough to take 50
  for (let page = 1; page <= 4; page++) {
    const data = await apiGet("/api/popular", { page });

    const m = Array.isArray(data.movies) ? data.movies : [];
    const t = Array.isArray(data.tv) ? data.tv : [];

    moviesOut.push(...m.map(x => ({ ...x, type: "movie" })));
    tvOut.push(...t.map(x => ({ ...x, type: "tv" })));

    if (moviesOut.length >= POPULAR_COUNT && tvOut.length >= POPULAR_COUNT) break;
  }

  return {
    movies: moviesOut.filter(x => x && x.id).slice(0, POPULAR_COUNT),
    tv: tvOut.filter(x => x && x.id).slice(0, POPULAR_COUNT),
  };
}

function renderPopularGrid(container, items) {
  if (!container) return;

  const list = (items || []).filter(Boolean).slice(0, POPULAR_COUNT);
  if (!list.length) {
    container.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="popGrid">
      ${list.map((m) => {
        const type = asType(m.type || m.media_type, "movie");
        const poster = m.poster
          ? `<img class="popPoster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
          : `<div class="popPoster placeholder"></div>`;

        return `
          <button class="popCard" type="button" data-id="${esc(m.id)}" data-type="${esc(type)}">
            ${poster}
            <div class="popTitle">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll(".popCard").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const type = asType(btn.getAttribute("data-type") || "movie", "movie");
      if (id) loadById(id, type);
    });
  });
}

async function loadPopularNow() {
  if (!els.popularMovies && !els.popularTv) return;

  if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Loading…</div>`;
  if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Loading…</div>`;

  try {
    const { movies, tv } = await fetchPopularPagesTo50();

    renderPopularGrid(els.popularMovies, movies);
    renderPopularGrid(els.popularTv, tv);

    // ✅ seed random cache too
    popularCache.movies = movies.slice();
    popularCache.tv = tv.slice();
    popularLoadedOnce = true;

  } catch (e) {
    // Never stay stuck on Loading...
    if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
  }
}

/* -----------------------------
   ✅ Random (CLIENT-SIDE) — uses popular cache
------------------------------*/
async function ensurePopularCache() {
  if (popularLoadedOnce && (popularCache.movies.length || popularCache.tv.length)) return;

  const { movies, tv } = await fetchPopularPagesTo50();
  popularCache.movies = movies.slice();
  popularCache.tv = tv.slice();
  popularLoadedOnce = true;
}

async function doRandom() {
  clearLists();
  setMeta("Picking random…", false);

  try {
    await ensurePopularCache();

    let pool = [];
    if (mediaFilter === "movie") pool = popularCache.movies.slice();
    else if (mediaFilter === "tv") pool = popularCache.tv.slice();
    else pool = [...popularCache.movies, ...popularCache.tv];

    pool = pool.filter(x => x && x.id);

    if (!pool.length) throw new Error("Popular feed unavailable, cannot pick random.");

    const chosen = pick(pool);
    const chosenType = asType(chosen.type || chosen.media_type, "movie");

    await loadById(chosen.id, chosenType);
    setMeta("Random picked ✅", false);
  } catch (e) {
    renderTarget(null);
    clearLists();
    setMeta(`Random failed. (${e.message})`, true);
  }
}

/* -----------------------------
   Init
------------------------------*/
function initUI() {
  // Genre dropdown
  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) => `<option value="${esc(val)}">${esc(name)}</option>`).join("");
  }

  // Rating range sync
  if (els.minRating && els.minRatingVal) {
    const sync = () => (els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`);
    els.minRating.addEventListener("input", sync);
    sync();
  }

  // Suggest / Enter to search
  els.q?.addEventListener("input", onSuggestInput);
  els.q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveMode("none");
      doSearch();
    }
  });

  els.searchBtn?.addEventListener("click", () => {
    setActiveMode("none");
    doSearch();
  });

  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // Watchlist modal
  els.watchlistBtn?.addEventListener("click", () => {
    setActiveMode("watchlist");
    openWatchlist();
  });
  els.closeModal?.addEventListener("click", () => {
    closeWatchlist();
    setActiveMode("none");
  });
  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) {
      closeWatchlist();
      setActiveMode("none");
    }
  });

  // Mode buttons
  els.randomBtn?.addEventListener("click", () => {
    setActiveMode("random");
    doRandom();
  });

  els.tvOnlyBtn?.addEventListener("click", () => {
    setActiveMode("tv");
    mediaFilter = "tv";
    if ((els.q?.value || "").trim()) doSearch();
  });

  els.movieOnlyBtn?.addEventListener("click", () => {
    setActiveMode("movie");
    mediaFilter = "movie";
    if ((els.q?.value || "").trim()) doSearch();
  });

  // Load by share link
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  const type = asType(url.searchParams.get("type") || "movie", "movie");
  if (id) loadById(id, type);

  // Popular Now
  loadPopularNow();

  // ✅ IMPORTANT: no button highlighted on load
  setActiveMode("none");
}

initUI();
renderTarget(null);
clearLists();
setMeta("Ready.", false);
/* -----------------------------
   Theme System
------------------------------*/

const themeToggle = document.getElementById("themeToggle");
const themeOptions = document.getElementById("themeOptions");
const themeButtons = document.querySelectorAll(".themeOption");

themeToggle?.addEventListener("click", () => {
  themeOptions.classList.toggle("hidden");
});

themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.getAttribute("data-theme");

    document.body.classList.remove(
      "theme-blue",
      "theme-red",
      "theme-green",
      "theme-purple"
    );

    document.body.classList.add(`theme-${theme}`);
    themeOptions.classList.add("hidden");
  });
});
