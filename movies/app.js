/* app.js — FILM_MATRIX (static frontend)
   Endpoints expected:
   - /api/suggest?q=... (&media=any|movie|tv optional)
   - /api/search?q=...  (&media=any|movie|tv optional)
   - /api/resolve?id=...&type=movie|tv
   - /api/similar?id=...&type=movie|tv&minRating=...&genre=...&yearMin=...
   - /api/random?minRating=...&genre=...&yearMin=...&media=any|movie|tv
   - /api/videos?id=...&type=movie|tv   => { key: "YouTubeKey" }
   - Popular:
     - /api/popular                 => { movies:[...], tv:[...] }
       OR:
     - /api/popular-movies          => { results:[...] }
     - /api/popular-tv              => { results:[...] }
*/

const YEAR_MIN = 1950;

const GENRES = [
  ["any", "Any"],
  // Movies
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Sci-Fi"],
  [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
  // TV genres (TMDb TV)
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
  randomBtn: document.getElementById("random"),
  watchlistBtn: document.getElementById("watchlistBtn"),

  // Optional new filter buttons (support multiple id variants)
  tvBtn:
    document.getElementById("tvBtn") ||
    document.getElementById("tvOnlyBtn") ||
    document.getElementById("tvOnly") ||
    null,

  moviesBtn:
    document.getElementById("moviesBtn") ||
    document.getElementById("movieOnlyBtn") ||
    document.getElementById("movieOnly") ||
    null,

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

// Media filter mode for search/suggest/random
// "any" | "movie" | "tv"
let MEDIA_MODE = "any";

/* -----------------------------
   Helpers
------------------------------*/
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtRating(r) {
  if (typeof r !== "number" || !Number.isFinite(r)) return "—";
  return r.toFixed(1);
}

function fmtYear(y) {
  return y ? `(${esc(y)})` : "";
}

// Make any error payload readable (object -> JSON string)
function normalizeErrorMessage(x) {
  if (x == null) return "Unknown error";
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    if (typeof x.message === "string") return x.message;
    if (typeof x.error === "string") return x.error;
    if (typeof x.error?.message === "string") return x.error.message;
    try { return JSON.stringify(x); } catch { return "Unknown error"; }
  }
  return String(x);
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
    const raw = (json && (json.error ?? json)) || `${res.status} ${res.statusText}`;
    const msg = normalizeErrorMessage(raw) || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;        // ✅ store full body for catch blocks
    err.raw = raw;          // ✅ store raw too
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

  // ✅ don't send "any" as genre
  let genre = String(els.genre?.value || "any").trim().toLowerCase();
  if (genre === "any") genre = "";

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
   Button highlight (primary class control)
------------------------------*/
function clearTopHighlights() {
  [els.watchlistBtn, els.randomBtn, els.tvBtn, els.moviesBtn].forEach((b) => {
    if (!b) return;
    b.classList.remove("primary");
  });
}

function setActiveButton(btn) {
  clearTopHighlights();
  if (btn) btn.classList.add("primary");
}

// After "Random" finishes, return highlight to current filter (tv/movies) or clear.
function restoreFilterHighlight() {
  if (MEDIA_MODE === "tv" && els.tvBtn) return setActiveButton(els.tvBtn);
  if (MEDIA_MODE === "movie" && els.moviesBtn) return setActiveButton(els.moviesBtn);
  clearTopHighlights();
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
  const data = await apiGet("/api/videos", { id, type });
  return data?.key || "";
}

/* -----------------------------
   Render Target
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

  const poster = m.poster ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />` : "";
  const genres = Array.isArray(m.genres)
    ? m.genres.map((g) => genreNameById.get(Number(g)) || "").filter(Boolean).join(", ")
    : "";

  const typeLabel = (m.type || "movie");
  const typeUpper = typeof typeLabel === "string" ? typeLabel.toUpperCase() : "MOVIE";

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster}
      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
          <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
        </div>
        <div class="muted">${esc(genres)}</div>
        <div class="overview">${esc(m.overview || "")}</div>
        <div class="muted" style="margin-top:10px">Type: ${esc(typeUpper)}</div>
      </div>
    </div>
  `;

  els.targetActions?.classList.remove("hidden");

  if (els.openImdb) {
    els.openImdb.onclick = () => {
      const t = (m.type || "movie").toLowerCase();
      window.open(`https://www.themoviedb.org/${t}/${encodeURIComponent(m.id)}`, "_blank");
    };
  }

  if (els.copyLink) {
    els.copyLink.onclick = async () => {
      try {
        const u = new URL(location.href);
        u.searchParams.set("id", String(m.id));
        u.searchParams.set("type", String(m.type || "movie"));
        await navigator.clipboard.writeText(u.toString());
        alert("Link copied ✅");
      } catch {
        alert("Copy failed (browser blocked clipboard).");
      }
    };
  }

  if (els.addWatch) els.addWatch.onclick = () => addToWatchlist(m);

  (async () => {
    try {
      const key = m.trailerKey || await fetchTrailerKey(m.id, m.type || "movie");
      renderTrailerEmbed(key);
    } catch {
      renderTrailerEmbed("");
    }
  })();

  setMeta(`Selected: ${m.title}`, false);
}

/* -----------------------------
   Render Similar
------------------------------*/
function renderSimilar(items) {
  const list = (items || []).filter(Boolean).slice(0, 20);
  if (!els.results) return;

  if (!list.length) {
    els.results.innerHTML = `<div class="muted">No similar titles found (try another title).</div>`;
    return;
  }

  els.results.innerHTML = list.map((m) => {
    const poster = m.poster
      ? `<img class="poster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
      : `<div class="poster placeholder"></div>`;

    const genres = Array.isArray(m.genres)
      ? m.genres.map((g) => genreNameById.get(Number(g)) || "").filter(Boolean).slice(0, 4).join(", ")
      : "";

    const type = (m.type || "movie").toLowerCase();

    return `
      <div class="simCard" data-id="${esc(m.id)}" data-type="${esc(type)}">
        <div class="targetGrid">
          ${poster}
          <div class="targetInfo">
            <div class="titleRow">
              <div class="title">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
              <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
            </div>
            <div class="muted">${esc(genres)}</div>
            <div class="overview clamp3">${esc(m.overview || "")}</div>

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

  els.results.querySelectorAll(".simCard").forEach((card) => {
    const id = card.getAttribute("data-id");
    const type = card.getAttribute("data-type") || "movie";

    const openBtn = card.querySelector(".openBtn");
    const trailerBtn = card.querySelector(".trailerBtn");
    const tmdbBtn = card.querySelector(".tmdbBtn");
    const mini = card.querySelector(".miniTrailer");

    openBtn?.addEventListener("click", () => loadById(id, type));
    tmdbBtn?.addEventListener("click", () => window.open(`https://www.themoviedb.org/${type}/${encodeURIComponent(id)}`, "_blank"));

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
  els.suggest.innerHTML = list.map((m) => `
    <button class="suggestItem" type="button" data-id="${esc(m.id)}" data-type="${esc(m.type || "movie")}">
      <span>${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
      <span class="muted">${esc((m.type || "movie").toUpperCase())}</span>
    </button>
  `).join("");

  els.suggest.querySelectorAll(".suggestItem").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      const type = b.getAttribute("data-type") || "movie";
      els.suggest.classList.add("hidden");
      if (id) await loadById(id, type);
    });
  });
}

/* -----------------------------
   Matches
------------------------------*/
function renderMatches(items) {
  if (!els.matches) return;
  const list = (items || []).slice(0, 10);

  if (!list.length) {
    els.matches.innerHTML = "";
    els.matches.classList.add("hidden");
    return;
  }

  els.matches.classList.remove("hidden");
  els.matches.innerHTML = list.map(m => `
    <button class="chip" type="button" data-id="${esc(m.id)}" data-type="${esc(m.type || "movie")}">
      <span class="chipTitle">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
      <span class="chipMeta">${esc((m.type || "movie").toUpperCase())} • ⭐ ${esc(fmtRating(m.rating))}</span>
    </button>
  `).join("");

  els.matches.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const type = btn.getAttribute("data-type") || "movie";
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
      // optional media filter if your backend supports it
      const data = await apiGet("/api/suggest", { q, media: MEDIA_MODE });
      renderSuggestions(data.results || []);
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
    const r = await apiGet("/api/resolve", { id, type });
    const target = r.target || r;
    if (!target?.id) throw new Error("Resolve did not return a target id.");

    renderTarget(target);

    const f = getFilters();
    const sim = await apiGet("/api/similar", {
      id: target.id,
      type: target.type || type,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN
    });

    renderSimilar(sim.similar || sim.results || []);
  } catch (e) {
    renderTarget(null);
    clearLists();

    const msg = normalizeErrorMessage(e?.body?.error || e?.raw || e?.body || e?.message);
    setMeta(`Failed. (API ${e.status || "?"} – ${msg})`, true);
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
    // optional media filter if your backend supports it
    const data = await apiGet("/api/search", { q, media: MEDIA_MODE });
    const items = data.items || data.results || [];

    renderMatches(items);

    const first = data.target || items[0] || null;
    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    await loadById(first.id, first.type || "movie");
  } catch (e) {
    renderTarget(null);
    clearLists();

    const msg = normalizeErrorMessage(e?.body?.error || e?.raw || e?.body || e?.message);
    setMeta(`Search failed. (API ${e.status || "?"} – ${msg})`, true);
  }
}

/* -----------------------------
   Random
------------------------------*/
async function doRandom() {
  clearLists();
  setMeta("Picking random…", false);

  // ✅ highlight Random only while running
  setActiveButton(els.randomBtn);

  try {
    const f = getFilters();
    const data = await apiGet("/api/random", {
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN,
      media: MEDIA_MODE
    });

    const target = data.target || null;
    if (!target?.id) {
      renderTarget(null);
      setMeta("Random failed (no target).", true);
      restoreFilterHighlight();
      return;
    }

    await loadById(target.id, target.type || "movie");
    restoreFilterHighlight();
  } catch (e) {
    renderTarget(null);
    clearLists();

    // ✅ FIX: pull error from body/raw so it never shows [object Object]
    const msg = normalizeErrorMessage(e?.body?.error || e?.raw || e?.body || e?.message);
    setMeta(`Random failed. (API ${e.status || "?"} – ${msg})`, true);

    restoreFilterHighlight();
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
  const list = loadWatchlist();
  if (list.some((x) => String(x.id) === String(m.id) && String(x.type) === String(m.type))) return;
  list.unshift({ id: m.id, type: m.type || "movie", title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function openWatchlist() {
  setActiveButton(els.watchlistBtn);

  const list = loadWatchlist();
  if (!els.watchlist) return;

  els.watchlist.innerHTML = list.length
    ? list.map((m) => `
        <div class="watchItem">
          ${m.poster ? `<img class="watchPoster" src="${esc(m.poster)}" alt="" />` : ""}
          <div>
            <div>
              <strong>${esc(m.title || "")}</strong>
              <span class="muted"> ${fmtYear(m.year)}</span>
              <span class="muted"> (${esc((m.type||"movie").toUpperCase())})</span>
            </div>
            <div class="watchMeta">⭐ ${esc(fmtRating(m.rating))}</div>
            <div style="margin-top:8px">
              <button class="btn sm" data-id="${esc(m.id)}" data-type="${esc(m.type || "movie")}">Open</button>
            </div>
          </div>
        </div>
      `).join("")
    : `<div class="muted">No watchlist items yet.</div>`;

  els.watchlist.querySelectorAll("button[data-id]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const type = b.getAttribute("data-type") || "movie";
      closeWatchlist();
      loadById(id, type);
    });
  });

  els.modal?.classList.remove("hidden");
}

function closeWatchlist() {
  els.modal?.classList.add("hidden");
  restoreFilterHighlight();
}

/* -----------------------------
   Popular Now (30 + 30)
------------------------------*/
function renderPopularGrid(container, items) {
  if (!container) return;

  const list = (items || []).slice(0, 30);
  if (!list.length) {
    container.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="popGrid">
      ${list.map((m) => {
        const poster = m.poster
          ? `<img class="popPoster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
          : `<div class="popPoster placeholder"></div>`;

        return `
          <button class="popCard" type="button" data-id="${esc(m.id)}" data-type="${esc(m.type || "movie")}">
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
      const type = btn.getAttribute("data-type") || "movie";
      if (id) loadById(id, type);
    });
  });
}

async function loadPopularNow() {
  if (!els.popularMovies && !els.popularTv) return;

  if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Loading…</div>`;
  if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Loading…</div>`;

  try {
    const data = await apiGet("/api/popular", { page: 1 });
    renderPopularGrid(els.popularMovies, data.movies || []);
    renderPopularGrid(els.popularTv, data.tv || []);
    return;
  } catch {}

  try {
    const [m, t] = await Promise.all([
      apiGet("/api/popular-movies", { page: 1 }),
      apiGet("/api/popular-tv", { page: 1 }),
    ]);

    renderPopularGrid(els.popularMovies, m.results || m.items || []);
    renderPopularGrid(els.popularTv, t.results || t.items || []);
  } catch {
    if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
  }
}

/* -----------------------------
   Init
------------------------------*/
function initUI() {
  // ✅ ensure no button starts highlighted
  clearTopHighlights();

  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) => `<option value="${esc(val)}">${esc(name)}</option>`).join("");
  }

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

  els.randomBtn?.addEventListener("click", () => {
    // Random is an action; highlight only while running
    doRandom();
  });

  // ✅ TV/Movie filter buttons (persist highlight)
  els.tvBtn?.addEventListener("click", () => {
    MEDIA_MODE = "tv";
    setActiveButton(els.tvBtn);
    setMeta("TV mode ✅ (search + random will use TV shows)", false);
  });

  els.moviesBtn?.addEventListener("click", () => {
    MEDIA_MODE = "movie";
    setActiveButton(els.moviesBtn);
    setMeta("Movie mode ✅ (search + random will use movies)", false);
  });

  // Watchlist modal
  els.watchlistBtn?.addEventListener("click", openWatchlist);
  els.closeModal?.addEventListener("click", closeWatchlist);
  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) closeWatchlist();
  });

  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // Deep link
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type") || "movie";
  if (id) loadById(id, type);

  loadPopularNow();
}

initUI();
renderTarget(null);
clearLists();
setMeta("Ready.", false);
