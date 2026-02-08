/* movies/app.js — NEONSIMILAR (static frontend)
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

  // Your HTML uses these ids (per your latest snippet)
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
  openImdb: document.getElementById("openImdb"), // button text might say IMDB, we open TMDb
  copyLink: document.getElementById("copyLink"),

  similar: document.getElementById("similar"),
};

const API_BASE = ""; // IMPORTANT: keep empty, API is at /api (not /movies/api)

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
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text || "Invalid JSON" };
  }

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
  const genre = String(els.genre?.value || "").trim(); // allow "Any" or ""
  const yearRaw = String(els.year?.value || "").trim();

  let yearMin = "";
  let yearMax = "";

  // Supports "2000+" or "2014" etc
  if (yearRaw && yearRaw !== "Any") {
    const plus = yearRaw.match(/^(\d{4})\+$/);
    if (plus) {
      yearMin = plus[1];
      yearMax = "";
    } else if (/^\d{4}$/.test(yearRaw)) {
      yearMin = yearRaw;
      yearMax = yearRaw;
    }
  }

  // Normalize genre: some backends expect empty for Any
  const g = (genre.toLowerCase() === "any") ? "" : genre;

  return { minRating, genre: g, yearMin, yearMax };
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

function clearTrailer() {
  if (!els.trailer) return;
  els.trailer.classList.add("hidden");
  els.trailer.innerHTML = "";
}

function renderTarget(m) {
  clearTrailer();

  if (!els.target) return;

  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions?.classList.add("hidden");
    setMeta("Ready.", false);
    return;
  }

  // Prefer best poster available from resolve.js
  const posterSrc = m.posterOriginal || m.posterLarge || m.poster || "";
  const poster = posterSrc
    ? `<img class="poster" src="${esc(posterSrc)}" alt="${esc(m.title)} poster" />`
    : "";

  const genres = Array.isArray(m.genres) ? m.genres.join(", ") : "";
  const rating = (m.rating ?? "").toString();

  els.target.innerHTML = `
    <div class="targetGrid">
      ${poster}
      <div class="targetInfo">
        <div class="titleRow">
          <div class="title">
            ${esc(m.title)} <span class="muted">(${esc(m.year || "")})</span>
          </div>
          <div class="pill">⭐ ${esc(rating || "—")}</div>
        </div>
        <div class="muted">${esc(genres)}</div>
        <div class="overview">${esc(m.overview || "")}</div>
      </div>
    </div>
  `;

  // Auto-embed trailer if resolve returns trailerKey
  if (els.trailer) {
    const key = m.trailerKey || "";
    if (key) {
      const src = `https://www.youtube.com/embed/${encodeURIComponent(key)}`;
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
  }

  if (els.targetActions) els.targetActions.classList.remove("hidden");

  // “IMDB” button opens TMDb (we have TMDb id reliably)
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

  if (els.addWatch) {
    els.addWatch.onclick = () => addToWatchlist(m);
  }

  setMeta(`Ready. Selected: ${m.title}`, false);
}

function renderSimilar(items) {
  const list = (items || []).filter(Boolean);
  if (!els.similar) return;

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

  // Click loads that movie via resolve → similar
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
async function onSuggestInput() {
  clearTimeout(suggestTimer);
  const q = (els.q?.value || "").trim();

  if (q.length < 2) {
    renderSuggestions([]);
    return;
  }

  suggestTimer = setTimeout(async () => {
    try {
      const data = await apiGet("/api/suggest", { q });
      renderSuggestions(data.results || data.items || []);
    } catch {
      renderSuggestions([]);
    }
  }, 180);
}

async function loadById(id) {
  clearSimilar();
  setMeta("Loading…", false);

  try {
    // resolve returns the full object (per my resolve.js), but support {target:...} too
    const r = await apiGet("/api/resolve", { id });
    const target = r.target || r;

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

    renderSimilar(sim.similar || sim.results || sim.items || []);
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
    // 1) search titles
    const data = await apiGet("/api/search", { q });

    // support multiple shapes
    const list = data.items || data.results || [];
    const first = data.target || list[0] || null;

    if (!first?.id) {
      renderTarget(null);
      setMeta("No match found.", true);
      return;
    }

    // 2) resolve for full details + trailerKey + large posters
    const r = await apiGet("/api/resolve", { id: first.id });
    const target = r.target || r;

    if (!target?.id) {
      renderTarget(null);
      setMeta("Resolve failed (missing id).", true);
      return;
    }

    // 3) render target
    renderTarget(target);

    // 4) fetch similar
    const f = getFilters();
    const sim = await apiGet("/api/similar", {
      id: target.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || sim.items || []);
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

    // random typically returns {target:...}
    const target = data.target || data;

    if (!target?.id) {
      renderTarget(null);
      setMeta("Random failed (no target).", true);
      return;
    }

    // If random doesn’t include trailer/posterOriginal, resolve it for full experience
    const r = await apiGet("/api/resolve", { id: target.id });
    const full = r.target || r;

    renderTarget(full);

    const sim = await apiGet("/api/similar", {
      id: full.id,
      minRating: f.minRating,
      genre: f.genre,
      yearMin: f.yearMin,
      yearMax: f.yearMax,
    });

    renderSimilar(sim.similar || sim.results || sim.items || []);
  } catch (e) {
    renderTarget(null);
    clearSimilar();
    setMeta(`Random failed. (API ${e.status || "?"} – ${e.message})`, true);
  }
}

/* Watchlist */
const WL_KEY = "neonsimilar_watchlist_v1";

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WL_KEY) || "[]");
  } catch {
    return [];
  }
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
    poster: m.posterOriginal || m.posterLarge || m.poster || "",
  });

  saveWatchlist(list);
  alert("Added to Watchlist ✅");
}

function initUI() {
  // rating label
  if (els.minRating && els.minRatingVal) {
    const sync = () => {
      els.minRatingVal.textContent = `${Number(els.minRating.value || 0)}/10`;
    };
    els.minRating.addEventListener("input", sync);
    sync();
  }

  // suggestions
  els.q?.addEventListener("input", onSuggestInput);

  // enter key submits search
  els.q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  // buttons
  els.searchBtn?.addEventListener("click", doSearch);
  els.randomBtn?.addEventListener("click", doRandom);

  // hide suggestions when tapping elsewhere
  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

  // load from share link (?id=123)
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (id) loadById(id);
}

// boot
initUI();
renderTarget(null);
clearSimilar();
setMeta("Ready.", false);
