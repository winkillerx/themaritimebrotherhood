/* movies/app.js — FILM_MATRIX / NEONSIMILAR (static frontend)
   Endpoints:
   - /api/suggest?q=...
   - /api/search?q=...
   - /api/resolve?id=...
   - /api/similar?id=...&minRating=...&genre=...&yearMin=...
   - /api/random?minRating=...&genre=...&yearMin=...
   - /api/tmdb?path=movie/{id}/videos     (proxy)
*/

const YEAR_MIN = 1950;

// Keep local list (fast + no extra API calls)
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

  results: document.getElementById("results"),

  modal: document.getElementById("modal"),
  closeModal: document.getElementById("closeModal"),
  watchlist: document.getElementById("watchlist"),
};

const API_BASE = ""; // api lives at /api

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

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

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

function clearTargetTrailer() {
  if (!els.trailer) return;
  els.trailer.classList.add("hidden");
  els.trailer.innerHTML = "";
}

/* -------------------------
   Trailer fetching (cached)
-------------------------- */

const trailerKeyCache = new Map(); // tmdbId -> youtubeKey | null
const trailerInflight = new Map(); // tmdbId -> Promise(youtubeKey|null)

async function fetchYouTubeTrailerKey(tmdbId) {
  const id = String(tmdbId);

  if (trailerKeyCache.has(id)) return trailerKeyCache.get(id);

  if (trailerInflight.has(id)) return trailerInflight.get(id);

  const p = (async () => {
    try {
      // /api/tmdb expects ?path=... (your serverless proxy)
      const data = await apiGet("/api/tmdb", { path: `movie/${id}/videos` });
      const vids = data?.results || [];

      // Prefer official Trailer/Teaser first
      const yt =
        vids.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) ||
        vids.find(v => v.site === "YouTube");

      const key = yt?.key ? String(yt.key) : null;
      trailerKeyCache.set(id, key);
      return key;
    } catch {
      trailerKeyCache.set(id, null);
      return null;
    } finally {
      trailerInflight.delete(id);
    }
  })();

  trailerInflight.set(id, p);
  return p;
}

function buildYouTubeIframe(key) {
  const src = `https://www.youtube.com/embed/${encodeURIComponent(key)}`;
  return `
    <iframe
      loading="lazy"
      src="${src}"
      title="Trailer"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;
}

async function showTargetTrailer(tmdbId) {
  if (!els.trailer) return;
  clearTargetTrailer();

  const key = await fetchYouTubeTrailerKey(tmdbId);
  if (!key) return; // no trailer available, just stay hidden

  els.trailer.innerHTML = buildYouTubeIframe(key);
  els.trailer.classList.remove("hidden");
}

/* -------------------------
   Render Target
-------------------------- */

function renderTarget(m) {
  clearTargetTrailer();

  if (!els.target) return;

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions?.classList.add("hidden");
    return;
  }

  const poster = m.poster
    ? `<img class="poster" src="${esc(m.poster)}" alt="${esc(m.title)} poster" />`
    : `<div class="poster placeholder"></div>`;

  const genres = Array.isArray(m.genres)
    ? m.genres
        .map((g) => genreNameById.get(Number(g)) || "")
        .filter(Boolean)
        .join(", ")
    : "";

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

  els.targetActions?.classList.remove("hidden");

  if (els.openImdb) {
    els.openImdb.onclick = () => {
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

  // ✅ show target trailer (non-blocking)
  showTargetTrailer(m.id);
}

/* -------------------------
   Render Similar (cards)
   - Open button loads as target
   - Trailer button toggles inline trailer
-------------------------- */

function renderSimilar(items) {
  if (!els.results) return;

  const list = (items || []).filter(Boolean);
  if (!list.length) {
    clearSimilar();
    return;
  }

  els.results.innerHTML = list.map((m) => {
    const title = esc(m.title || "Untitled");
    const year = m.year ? esc(m.year) : "";
    const rating = (m.rating ?? "").toString();
    const overview = esc(m.overview || "");

    const poster = m.poster
      ? `<img class="poster" src="${esc(m.poster)}" alt="${title} poster" loading="lazy" />`
      : `<div class="poster placeholder"></div>`;

    return `
      <div class="simCard" data-id="${esc(m.id)}">
        <div class="targetGrid">
          ${poster}
          <div class="targetInfo">
            <div class="titleRow">
              <div class="title">${title} ${year ? `<span class="muted">(${year})</span>` : ""}</div>
              <div class="pill">⭐ ${esc(rating || "—")}</div>
            </div>
            <div class="overview clamp3">${overview}</div>

            <div class="simActions">
              <button class="btn simOpen" type="button">Open</button>
              <button class="btn simTrailer" type="button">Trailer</button>
            </div>
          </div>
        </div>

        <div class="miniTrailer hidden"></div>
      </div>
    `;
  }).join("");

  // Wire buttons
  els.results.querySelectorAll(".simCard").forEach((card) => {
    const id = card.getAttribute("data-id");
    const openBtn = card.querySelector(".simOpen");
    const trailerBtn = card.querySelector(".simTrailer");
    const mini = card.querySelector(".miniTrailer");

    openBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (id) await loadById(id);
    });

    trailerBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!id || !mini) return;

      // Toggle
      const isOpen = !mini.classList.contains("hidden");
      if (isOpen) {
        mini.classList.add("hidden");
        mini.innerHTML = "";
        return;
      }

      // Close other open mini trailers (keeps mobile snappy)
      els.results.querySelectorAll(".miniTrailer").forEach((x) => {
        if (x !== mini) {
          x.classList.add("hidden");
          x.innerHTML = "";
        }
      });

      mini.classList.remove("hidden");
      mini.innerHTML = `<div class="muted">Loading trailer…</div>`;

      const key = await fetchYouTubeTrailerKey(id);
      if (!key) {
        mini.innerHTML = `<div class="muted">No trailer found for this title.</div>`;
        return;
      }

      mini.innerHTML = buildYouTubeIframe(key);
    });

    // Optional: tap card to open
    card.addEventListener("click", async () => {
      if (id) await loadById(id);
    });
  });
}

/* -------------------------
   Suggestions
-------------------------- */

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

/* -------------------------
   Load flow
-------------------------- */

async function loadById(id) {
  clearSimilar();
  setMeta("Loading…", false);

  try {
    const r = await apiGet("/api/resolve", { id });
    const target = r.target || r;
    if (!target?.id) throw new Error("Resolve did not return a target id.");

    renderTarget(target);

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

    const target = data.target || null;
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

/* -------------------------
   Watchlist
-------------------------- */

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
  if (!els.modal || !els.watchlist) return;

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

/* -------------------------
   Init
-------------------------- */

function initUI() {
  // Populate genre dropdown
  if (els.genre) {
    els.genre.innerHTML = GENRES.map(([val, name]) =>
      `<option value="${esc(val)}">${esc(name)}</option>`
    ).join("");
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
  els.randomBtn?.addEventListener("click", doRandom);

  // hide suggestions when tapping elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // watchlist modal
  els.watchlistBtn?.addEventListener("click", openWatchlist);
  els.closeModal?.addEventListener("click", closeWatchlist);
  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) closeWatchlist();
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
