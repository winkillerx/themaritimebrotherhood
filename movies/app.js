/* app.js — FILM_MATRIX (static frontend)
   Endpoints expected:
   - /api/suggest?q=...&media=any|movie|tv (media optional)
   - /api/search?q=...&media=any|movie|tv (media optional)
   - /api/resolve?id=...&type=movie|tv
   - /api/similar?id=...&type=movie|tv&minRating=...&genre=...&yearMin=...
   - /api/videos?id=...&type=movie|tv   => { key: "YouTubeKey" }
   - Genres:
     - /api/genres => { movie:[...], tv:[...], all:[...] }
   - Genre browse:
     - /api/genre?media=movie|tv|any&genre=ID&minRating=...&yearMin=...&page=1 => { results:[... ] }
   - Popular:
     - /api/popular                 => { movies:[...], tv:[...] }
       OR:
     - /api/popular-movies          => { results:[...] }
     - /api/popular-tv              => { results:[...] }
*/

const YEAR_MIN = 1950;

// Fallback genre list (used only if /api/genres fails)
const FALLBACK_GENRES = [
  ["any", "Any"],
  // Movies
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Sci-Fi"],
  [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
  // TV
  [10759, "Action & Adventure"], [10762, "Kids"], [10763, "News"], [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"], [10766, "Soap"], [10767, "Talk"], [10768, "War & Politics"],
];

let GENRES = [...FALLBACK_GENRES];
let genreNameById = new Map(GENRES.filter(([k]) => k !== "any").map(([id, name]) => [Number(id), name]));

const els = {
  q: document.getElementById("q"),
  suggest: document.getElementById("suggest"),
  searchBtn: document.getElementById("go"),

  // header buttons
  watchlistBtn: document.getElementById("watchlistBtn"),
  randomBtn: document.getElementById("randomBtn"),
  tvOnlyBtn: document.getElementById("tvOnlyBtn"),
  movieOnlyBtn: document.getElementById("movieOnlyBtn"),
  genreBtn: document.getElementById("genreBtn"),

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

  // Popular Now
  popularMovies: document.getElementById("popularMovies"),
  popularTv: document.getElementById("popularTv") || document.getElementById("popularTV"),
};

const API_BASE = "";

// any | movie | tv
let mediaMode = "any";

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

function typeToUpper(t) {
  return String(t || "movie").toUpperCase();
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
    // preserve the body if possible (helps show real server error)
    const msg = json?.error || json?.message || `${res.status} ${res.statusText}`;
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
  const genre = String(els.genre?.value || "any").trim();
  return { minRating, genre };
}

function clearLists() {
  if (els.results) els.results.innerHTML = `<div class="muted">No similar titles found (try another title).</div>`;
  if (els.matches) {
    els.matches.innerHTML = "";
    els.matches.classList.add("hidden");
  }
}

function setActiveHeader(btnEl) {
  const all = [els.randomBtn, els.tvOnlyBtn, els.movieOnlyBtn, els.genreBtn].filter(Boolean);
  all.forEach(b => b.classList.remove("primary"));
  if (btnEl) btnEl.classList.add("primary");
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

  // Genre "virtual" target
  if (m.type === "genre") {
    els.target.innerHTML = `
      <div class="targetGrid">
        <div class="poster placeholder"></div>
        <div class="targetInfo">
          <div class="titleRow">
            <div class="title">${esc(m.title || "Genre")}</div>
            <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
          </div>
          <div class="muted">Browse by tag / genre</div>
          <div class="overview">${esc(m.overview || "")}</div>
          <div class="muted" style="margin-top:10px">Mode: ${esc(typeToUpper(mediaMode))}</div>
        </div>
      </div>
    `;

    els.targetActions?.classList.add("hidden");
    setMeta(`Selected: ${m.title}`, false);
    return;
  }

  const poster = m.poster ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />` : "";
  const genres = Array.isArray(m.genres)
    ? m.genres.map((g) => genreNameById.get(Number(g)) || "").filter(Boolean).join(", ")
    : "";

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster || `<div class="poster placeholder"></div>`}
      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></div>
          <div class="pill">⭐ ${esc(fmtRating(m.rating))}</div>
        </div>
        <div class="muted">${esc(genres)}</div>
        <div class="overview">${esc(m.overview || "")}</div>
        <div class="muted" style="margin-top:10px">Type: ${esc(typeToUpper(m.type))}</div>
      </div>
    </div>
  `;

  els.targetActions?.classList.remove("hidden");

  if (els.openImdb) {
    els.openImdb.onclick = () => {
      const t = String(m.type || "movie").toLowerCase();
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

  // Load target trailer automatically
  (async () => {
    try {
      const key = m.trailerKey || await fetchTrailerKey(m.id, String(m.type || "movie").toLowerCase());
      renderTrailerEmbed(key);
    } catch {
      renderTrailerEmbed("");
    }
  })();

  setMeta(`Selected: ${m.title}`, false);
}

/* -----------------------------
   Render Similar (20 results + trailer button)
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

    const type = String(m.type || "movie").toLowerCase();

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
  els.suggest.innerHTML = list.map((m) => {
    const t = String(m.type || "movie").toLowerCase();
    // Apply client-side media filter if API doesn't.
    if (mediaMode !== "any" && t !== mediaMode) return "";

    return `
      <button class="suggestItem" type="button" data-id="${esc(m.id)}" data-type="${esc(t)}">
        <span>${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
        <span class="muted">${esc(typeToUpper(t))}</span>
      </button>
    `;
  }).filter(Boolean).join("");

  const btns = els.suggest.querySelectorAll(".suggestItem");
  if (!btns.length) {
    els.suggest.innerHTML = "";
    els.suggest.classList.add("hidden");
    return;
  }

  btns.forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      const type = b.getAttribute("data-type") || "movie";
      els.suggest.classList.add("hidden");
      if (id) await loadById(id, type);
    });
  });
}

/* -----------------------------
   Search matches
------------------------------*/
function renderMatches(items) {
  if (!els.matches) return;

  const list = (items || []).filter(Boolean).filter(m => {
    const t = String(m.type || "movie").toLowerCase();
    return mediaMode === "any" ? true : t === mediaMode;
  }).slice(0, 10);

  if (!list.length) {
    els.matches.innerHTML = "";
    els.matches.classList.add("hidden");
    return;
  }

  els.matches.classList.remove("hidden");
  els.matches.innerHTML = list.map(m => {
    const t = String(m.type || "movie").toLowerCase();
    return `
      <button class="chip" type="button" data-id="${esc(m.id)}" data-type="${esc(t)}">
        <span class="chipTitle">${esc(m.title)} <span class="muted">${fmtYear(m.year)}</span></span>
        <span class="chipMeta">${esc(typeToUpper(t))} • ⭐ ${esc(fmtRating(m.rating))}</span>
      </button>
    `;
  }).join("");

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
      // media param is optional; server can ignore it.
      const data = await apiGet("/api/suggest", { q, media: mediaMode });
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
      type: String(target.type || type).toLowerCase(),
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN,
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
    const data = await apiGet("/api/search", { q, media: mediaMode });
    const items = data.items || data.results || [];

    renderMatches(items);

    const first = (data.target && (mediaMode === "any" || String(data.target.type).toLowerCase() === mediaMode))
      ? data.target
      : (items || []).find((m) => {
          const t = String(m?.type || "movie").toLowerCase();
          return mediaMode === "any" ? true : t === mediaMode;
        }) || null;

    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    await loadById(first.id, String(first.type || "movie").toLowerCase());
  } catch (e) {
    renderTarget(null);
    clearLists();
    setMeta(`Search failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* -----------------------------
   Genre browse (🏷️)
   Uses current dropdown selection.
------------------------------*/
async function browseGenre() {
  const f = getFilters();
  const g = f.genre;

  if (!g || g === "any") {
    setMeta("Pick a Genre from the dropdown first.", true);
    return;
  }

  clearLists();
  setMeta("Loading genre…", false);

  // virtual target
  renderTarget({
    type: "genre",
    title: `Genre: ${genreNameById.get(Number(g)) || g}`,
    overview: "Showing titles in this genre. Tap any card to open it.",
    rating: "—",
  });

  try {
    const data = await apiGet("/api/genre", {
      media: mediaMode,
      genre: g,
      minRating: f.minRating,
      yearMin: YEAR_MIN,
      page: 1,
    });

    // show the genre titles in the Similar section
    renderSimilar(data.results || data.items || []);
    setMeta(`Genre loaded: ${genreNameById.get(Number(g)) || g}`, false);
  } catch (e) {
    clearLists();
    setMeta(`Genre failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* -----------------------------
   Random
   - calls /api/random first
   - if server fails, falls back to random from Popular feeds
------------------------------*/
function pickRandomFrom(list) {
  const arr = (list || []).filter(Boolean);
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

async function doRandom() {
  clearLists();
  setMeta("Picking random…", false);

  const f = getFilters();

  // 1) server random
  try {
    const data = await apiGet("/api/random", {
      minRating: f.minRating,
      genre: f.genre,
      yearMin: YEAR_MIN,
      media: mediaMode,
    });

    const target = data.target || null;
    if (!target?.id) throw new Error("Random returned no target.");

    await loadById(target.id, String(target.type || "movie").toLowerCase());
    return;
  } catch (e) {
    // 2) fallback: pick from popular
    try {
      const pool = [];
      const [m1, m2, t1, t2] = await Promise.all([
        apiGet("/api/popular-movies", { page: 1 }),
        apiGet("/api/popular-movies", { page: 2 }),
        apiGet("/api/popular-tv", { page: 1 }),
        apiGet("/api/popular-tv", { page: 2 }),
      ]);

      const movies = [...(m1.results || []), ...(m2.results || [])].map(x => ({ ...x, type: "movie" }));
      const tv = [...(t1.results || []), ...(t2.results || [])].map(x => ({ ...x, type: "tv" }));

      if (mediaMode === "movie") pool.push(...movies);
      else if (mediaMode === "tv") pool.push(...tv);
      else pool.push(...movies, ...tv);

      // apply filters locally
      const genreId = f.genre && f.genre !== "any" ? Number(f.genre) : null;
      const filtered = pool.filter((x) => {
        const okRating = Number(x.rating) >= f.minRating;
        const okYear = !x.year || Number(x.year) >= YEAR_MIN;
        const okGenre = !genreId || (Array.isArray(x.genres) && x.genres.map(Number).includes(genreId));
        return okRating && okYear && okGenre;
      });

      const pick = pickRandomFrom(filtered.length ? filtered : pool);
      if (!pick?.id) throw new Error("No fallback pool.");

      await loadById(pick.id, String(pick.type || "movie").toLowerCase());
      setMeta(`Random (fallback): ${pick.title}`, false);
      return;
    } catch {
      renderTarget(null);
      clearLists();
      setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
    }
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
  if (!m || !m.id) return;
  const list = loadWatchlist();
  const t = String(m.type || "movie").toLowerCase();
  if (list.some((x) => String(x.id) === String(m.id) && String(x.type) === t)) return;
  list.unshift({ id: m.id, type: t, title: m.title, year: m.year, rating: m.rating, poster: m.poster });
  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function openWatchlist() {
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
              <span class="muted"> (${esc(typeToUpper(m.type||"movie"))})</span>
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
      loadById(id, String(type).toLowerCase());
    });
  });

  els.modal?.classList.remove("hidden");
}

function closeWatchlist() {
  els.modal?.classList.add("hidden");
}

/* -----------------------------
   Popular Now
   - shows 50 movies + 50 TV (pulls 2 pages)
------------------------------*/
function renderPopularGrid(container, items) {
  if (!container) return;

  const list = (items || []).slice(0, 50);
  if (!list.length) {
    container.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="popGrid">
      ${list.map((m) => {
        const t = String(m.type || "movie").toLowerCase();
        const poster = m.poster
          ? `<img class="popPoster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
          : `<div class="popPoster placeholder"></div>`;

        return `
          <button class="popCard" type="button" data-id="${esc(m.id)}" data-type="${esc(t)}">
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

  // 1) Try combined endpoint first
  try {
    const data = await apiGet("/api/popular", { page: 1 });
    renderPopularGrid(els.popularMovies, (data.movies || []).map(x => ({ ...x, type: "movie" })));
    renderPopularGrid(els.popularTv, (data.tv || []).map(x => ({ ...x, type: "tv" })));
    return;
  } catch {
    // fallback below
  }

  // 2) Pull 2 pages of each for ~40 results, then slice to 50 if server returns more
  try {
    const [m1, m2, t1, t2] = await Promise.all([
      apiGet("/api/popular-movies", { page: 1 }),
      apiGet("/api/popular-movies", { page: 2 }),
      apiGet("/api/popular-tv", { page: 1 }),
      apiGet("/api/popular-tv", { page: 2 }),
    ]);

    const movies = [...(m1.results || m1.items || []), ...(m2.results || m2.items || [])]
      .map(x => ({ ...x, type: "movie" }));

    const tv = [...(t1.results || t1.items || []), ...(t2.results || t2.items || [])]
      .map(x => ({ ...x, type: "tv" }));

    renderPopularGrid(els.popularMovies, movies);
    renderPopularGrid(els.popularTv, tv);
  } catch {
    if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
  }
}

/* -----------------------------
   Genres (live)
------------------------------*/
async function loadGenresLive() {
  try {
    const data = await apiGet("/api/genres");
    const all = data.all || [];
    if (Array.isArray(all) && all.length) {
      GENRES = [["any", "Any"], ...all.map(g => [g.id, g.name])];
      genreNameById = new Map(all.map(g => [Number(g.id), String(g.name)]));
    }
  } catch {
    // keep fallback
  }

  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) => `<option value="${esc(val)}">${esc(name)}</option>`).join("");
  }
}

/* -----------------------------
   Init
------------------------------*/
function initUI() {
  // default: nothing highlighted
  setActiveHeader(null);

  // populate genre dropdown (fallback), then upgrade to live
  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) => `<option value="${esc(val)}">${esc(name)}</option>`).join("");
  }
  loadGenresLive();

  // Range sync
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
      doSearch();
    }
  });

  els.searchBtn?.addEventListener("click", doSearch);

  // Header modes
  els.watchlistBtn?.addEventListener("click", openWatchlist);

  els.randomBtn?.addEventListener("click", () => {
    setActiveHeader(els.randomBtn);
    doRandom();
  });

  els.movieOnlyBtn?.addEventListener("click", () => {
    mediaMode = "movie";
    setActiveHeader(els.movieOnlyBtn);
    setMeta("Movie mode ✅", false);
    renderSuggestions([]);
  });

  els.tvOnlyBtn?.addEventListener("click", () => {
    mediaMode = "tv";
    setActiveHeader(els.tvOnlyBtn);
    setMeta("TV mode ✅", false);
    renderSuggestions([]);
  });

  els.genreBtn?.addEventListener("click", () => {
    setActiveHeader(els.genreBtn);
    browseGenre();
  });

  // If user taps search input or hits Search, we consider it "any" unless they chose movie/tv.
  // Provide a quick way back to Any: long-press not reliable; so clicking the logo area isn't available.
  // We'll map a double-tap on the Search button to reset.
  let lastTap = 0;
  els.searchBtn?.addEventListener("touchend", () => {
    const now = Date.now();
    if (now - lastTap < 350) {
      mediaMode = "any";
      setActiveHeader(null);
      setMeta("Mode reset to ANY ✅", false);
      renderSuggestions([]);
    }
    lastTap = now;
  }, { passive: true });

  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // Watchlist modal
  els.closeModal?.addEventListener("click", closeWatchlist);
  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) closeWatchlist();
  });

  // If user arrives with ?id= & type=
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type") || "movie";
  if (id) loadById(id, String(type).toLowerCase());

  // Populate Popular Now
  loadPopularNow();
}

initUI();
renderTarget(null);
clearLists();
setMeta("Ready.", false);
