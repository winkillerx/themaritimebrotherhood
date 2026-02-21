/* ============================================================
   app.js — FILM_MATRIX
   Genre Discover + Boosted Search Integration
   ============================================================ */
const YEAR_MIN = 1950;
const POPULAR_COUNT = 54; // ✅ 50 each (Movie/TV)

const GENRES = [
  ["any", "Any"],
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"], [878, "Sci-Fi"],
  [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
  [10759, "Action & Adventure"], [10762, "Kids"], [10763, "News"], [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"], [10766, "Soap"], [10767, "Talk"], [10768, "War & Politics"],
];
/* ============================================================
   GENRE PRESETS — DISCOVER MODE (EXACT 50 CATEGORIES)
   Used by Genres section below Popular
   ============================================================ */

const GENRE_PRESETS = [
  // Crime / True Crime
  { name: "Serial Killers", keywords: "serial killer,true crime,murder", genres: "80,99", type: "both" },
  { name: "True Crime", keywords: "true crime,investigation,case", genres: "99,80", type: "both" },
  { name: "Cold Cases", keywords: "cold case,unsolved", genres: "80,99,9648", type: "both" },
  { name: "Detectives", keywords: "detective,investigation", genres: "80,9648", type: "both" },
  { name: "Gangsters", keywords: "mafia,gangster,organized crime", genres: "80,18", type: "both" },
  { name: "Heists", keywords: "heist,robbery,bank job", genres: "80,53", type: "both" },
  { name: "Courtroom & Trials", keywords: "courtroom,trial,lawyer", genres: "18,80", type: "both" },
  { name: "Prison Stories", keywords: "prison,inmate,escape", genres: "18,80", type: "both" },

  // Thrillers / Mystery
  { name: "Psy Thrillers", keywords: "psychological thriller,mind games", genres: "53,9648", type: "both" },
  { name: "Mind-Bending", keywords: "twist ending,mind bending", genres: "9648,53,878", type: "both" },
  { name: "Conspiracy", keywords: "conspiracy,cover up,whistleblower", genres: "53,9648", type: "both" },
  { name: "Whodunits", keywords: "whodunit,mystery", genres: "9648", type: "both" },
  { name: "Spies", keywords: "spy,espionage,agent", genres: "53,28", type: "both" },
  { name: "Political Thrillers", keywords: "political thriller,election,corruption", genres: "53,18", type: "both" },

  // Action
  { name: "Action Hits", keywords: "action", genres: "28", type: "both" },
  { name: "Martial Arts", keywords: "martial arts,fighting", genres: "28", type: "both" },
  { name: "War Action", keywords: "war,battle", genres: "10752,28", type: "both" },
  { name: "Survival", keywords: "survival,escape", genres: "28,53,12", type: "both" },
  { name: "Disaster Movies", keywords: "disaster,catastrophe", genres: "28,53", type: "both" },

  // Superhero / Comic
  { name: "Superhero", keywords: "superhero,comic book", genres: "28,878", type: "both" },
  { name: "Anti-Hero", keywords: "anti hero,vigilante", genres: "28,80", type: "both" },
  { name: "DC Vibes", keywords: "dc comics", genres: "28,878", type: "both" },
  { name: "Marvel Vibes", keywords: "marvel", genres: "28,878", type: "both" },

  // Horror
  { name: "Horror", keywords: "horror", genres: "27", type: "both" },
  { name: "Psy Horror", keywords: "psychological horror", genres: "27,53", type: "both" },
  { name: "Found Footage", keywords: "found footage", genres: "27", type: "both" },
  { name: "Ghosts", keywords: "paranormal,ghost,haunted", genres: "27", type: "both" },
  { name: "Slashers", keywords: "slasher,killer", genres: "27", type: "both" },
  { name: "Zombies", keywords: "zombie,undead", genres: "27,28", type: "both" },

  // Sci-Fi
  { name: "Sci-Fi", keywords: "science fiction,futuristic", genres: "878", type: "both" },
  { name: "Time Travel", keywords: "time travel,time loop", genres: "878,53,9648", type: "both" },
  { name: "AI & Robots", keywords: "artificial intelligence,robots", genres: "878,53", type: "both" },
  { name: "Cyberpunk", keywords: "cyberpunk,hacker,dystopia", genres: "878", type: "both" },
  { name: "Space & Aliens", keywords: "space,alien", genres: "878,12", type: "both" },
  { name: "Post-Apoc", keywords: "post apocalyptic,dystopian", genres: "878,28,53", type: "both" },

  // Fantasy
  { name: "Fantasy", keywords: "fantasy adventure", genres: "14,12", type: "both" },
  { name: "Magic & Wizards", keywords: "magic,wizard", genres: "14,12", type: "both" },
  { name: "Mythology", keywords: "mythology,gods,legend", genres: "14,12", type: "both" },

  // Romance / Comedy / Feel-good
  { name: "Rom-Com", keywords: "romantic comedy", genres: "35,10749", type: "both" },
  { name: "Romantic Drama", keywords: "romantic drama,love story", genres: "18,10749", type: "both" },
  { name: "Feel-Good", keywords: "feel good,inspiring,uplifting", genres: "35,18", type: "both" },
  { name: "Dark Comedy", keywords: "dark comedy", genres: "35,80", type: "both" },

  // Business / Tech
  { name: "Wall Street", keywords: "finance,wall street,stock market", genres: "18", type: "both" },
  { name: "Tech & Startups", keywords: "startup,tech company,hacker", genres: "18", type: "both" },

  // Documentary / Reality / History
  { name: "Docs", keywords: "documentary", genres: "99", type: "both" },
  { name: "Nature Docs", keywords: "nature,wildlife", genres: "99", type: "both" },
  { name: "History Docs", keywords: "history,war documentary", genres: "99,36,10752", type: "both" },
  { name: "Sports Docs", keywords: "sports documentary", genres: "99", type: "both" },

  // TV-special
  { name: "Mini-Series", keywords: "miniseries,limited series", genres: "", type: "tv" },
  { name: "Docuseries", keywords: "docuseries,documentary series", genres: "99", type: "tv" },
  { name: "Sitcoms", keywords: "sitcom", genres: "35", type: "tv" },
  { name: "Reality TV", keywords: "reality", genres: "10764", type: "tv" },

  // “Awards / Classics / Cult”
  { name: "Award Winners", keywords: "oscar winner,award winning", genres: "", type: "both" },
  { name: "Cult Classics", keywords: "cult classic", genres: "", type: "both" }
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
const themeSelect = document.getElementById("themeSelect");

function applyTheme(theme){
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("filmMatrixTheme", theme);
}

const savedTheme = localStorage.getItem("filmMatrixTheme") || "blue";
applyTheme(savedTheme);

if (themeSelect){
  themeSelect.value = savedTheme;
  themeSelect.addEventListener("change", e => {
    applyTheme(e.target.value);
  });
}
const API_BASE = "";

/* -----------------------------
   Mode / Highlighting
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
function padToMultiple(items, multiple) {
  const list = (items || []).slice();
  const missing = (multiple - (list.length % multiple)) % multiple;
  for (let i = 0; i < missing; i++) list.push(null);
  return list;
}

// Shrink font-size until the title fits inside its fixed-height box
function fitPopTitles(container) {
  if (!container) return;
  const titles = container.querySelectorAll(".popTitle");
  titles.forEach((el) => {
    // skip placeholders
    if (el.closest(".popCard")?.classList.contains("is-placeholder")) return;

    el.style.fontSize = ""; // reset to CSS default
    const maxLoops = 12;
    let size = parseFloat(getComputedStyle(el).fontSize) || 13;

    // keep shrinking until it fits the fixed height
    for (let i = 0; i < maxLoops; i++) {
      if (el.scrollHeight <= el.clientHeight + 1) break;
      size = Math.max(9, size - 0.5); // don’t go too tiny
      el.style.fontSize = `${size}px`;
      if (size <= 9) break;
    }
  });
}
/* -----------------------------
   Helpers
------------------------------*/
function normalizeTitle(t = "") {
  return t
    .toLowerCase()
    .replace(/[:\-–—]/g, " ")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyRelation(baseTitle, item) {
  const baseTokens = normalizeTitle(baseTitle)
    .split(" ")
    .filter(w => w.length > 2 && isNaN(w));

  const titleTokens = normalizeTitle(item.title || "")
    .split(" ")
    .filter(w => w.length > 2 && isNaN(w));

  if (!baseTokens.length || !titleTokens.length) return "other";

  // Count shared franchise words
  const shared = baseTokens.filter(w => titleTokens.includes(w)).length;

  // Require at least 2 shared core words (FAST + FURIOUS)
  const isSameFranchise = shared >= Math.min(2, baseTokens.length);

  if (!isSameFranchise) return "other";

  // Original
  if (normalizeTitle(item.title) === normalizeTitle(baseTitle)) {
    return "original";
  }

  // Prequel
  if (item.year && item.baseYear && item.year < item.baseYear) {
    return "prequel";
  }

  // Remake / reboot (same title, different year)
  if (
    normalizeTitle(item.title) === normalizeTitle(baseTitle) &&
    item.year !== item.baseYear
  ) {
    return "remake";
  }

  // Otherwise: sequel
  return "sequel";
}

function sortByFranchise(baseTitle, items, baseYear) {
  const enriched = items.map(m => ({
    ...m,
    baseYear,
    _relation: classifyRelation(baseTitle, { ...m, baseYear })
  }));

  const bucket = {
    original: [],
    sequel: [],
    prequel: [],
    remake: [],
    other: []
  };

  enriched.forEach(m => {
    (bucket[m._relation] || bucket.other).push(m);
  });

  // Chronological order inside buckets
  bucket.sequel.sort((a, b) => (a.year || 9999) - (b.year || 9999));
  bucket.prequel.sort((a, b) => (a.year || 9999) - (b.year || 9999));
  bucket.remake.sort((a, b) => (a.year || 9999) - (b.year || 9999));

  return [
    ...bucket.original,
    ...bucket.sequel,
    ...bucket.prequel,
    ...bucket.remake,
    ...bucket.other
  ];
}

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
// =========================
// Film Matrix UI dialogs
// =========================

let toastTimer = null;

function fmToast(msg, ms = 1600) {
  const el = document.getElementById("fmToast");
  if (!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
}

// =========================
// Film Matrix UI dialogs
// =========================

function fmConfirm(msg, title = "FILM MATRIX") {
  return new Promise((resolve) => {
    const wrap = document.getElementById("fmConfirm");
    const msgEl = document.getElementById("fmConfirmMsg");
    const ok = document.getElementById("fmConfirmOk");
    const cancel = document.getElementById("fmConfirmCancel");

    // Fallback if markup missing
    if (!wrap || !msgEl || !ok || !cancel) {
      resolve(window.confirm(msg));
      return;
    }

    // Title (optional)
    const titleEl =
      wrap.querySelector(".fmConfirmTitle") ||
      wrap.querySelector("#fmConfirmTitle");
    if (titleEl) titleEl.textContent = title;

    msgEl.textContent = msg;

    // Ensure both buttons visible + labeled
    cancel.classList.remove("hidden");
    ok.textContent = "OK";
    cancel.textContent = "CANCEL";

    wrap.classList.remove("hidden");

    const cleanup = () => {
      wrap.classList.add("hidden");
      ok.onclick = null;
      cancel.onclick = null;
      wrap.onclick = null;
      document.removeEventListener("keydown", onKey);
    };

    const onKey = (e) => {
      if (e.key === "Escape") { cleanup(); resolve(false); }
      if (e.key === "Enter") { cleanup(); resolve(true); }
    };

    ok.onclick = () => { cleanup(); resolve(true); };
    cancel.onclick = () => { cleanup(); resolve(false); };

    // Tap outside = cancel (matches your current behavior)
    wrap.onclick = (e) => {
      if (e.target === wrap) { cleanup(); resolve(false); }
    };

    document.addEventListener("keydown", onKey);
  });
}

// =========================
// Film Matrix single-button dialog (OK only)
// =========================
function fmAlert(msg, title = "FILM MATRIX") {
  return new Promise((resolve) => {
    const wrap = document.getElementById("fmConfirm");
    const msgEl = document.getElementById("fmConfirmMsg");
    const ok = document.getElementById("fmConfirmOk");
    const cancel = document.getElementById("fmConfirmCancel");

    // Fallback if markup missing
    if (!wrap || !msgEl || !ok) {
      window.alert(msg);
      resolve(true);
      return;
    }

    // Title (optional)
    const titleEl =
      wrap.querySelector(".fmConfirmTitle") ||
      wrap.querySelector("#fmConfirmTitle");
    if (titleEl) titleEl.textContent = title;

    msgEl.textContent = msg;
    wrap.classList.remove("hidden");

    // Hide cancel (OK only)
    if (cancel) cancel.classList.add("hidden");
    ok.textContent = "OK";

    const cleanup = () => {
      wrap.classList.add("hidden");
      ok.onclick = null;
      wrap.onclick = null;
      document.removeEventListener("keydown", onKey);
      if (cancel) cancel.classList.remove("hidden"); // restore for next confirm()
    };

    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        cleanup();
        resolve(true);
      }
    };

    ok.onclick = () => { cleanup(); resolve(true); };

    // Tap outside closes (like iOS)
    wrap.onclick = (e) => {
      if (e.target === wrap) { cleanup(); resolve(true); }
    };

    document.addEventListener("keydown", onKey);
  });
}
/* -----------------------------
   apiGet with timeout
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

/* -----------------------------------------------------------
   SECTION A: Helpers (place right after apiGet())
-----------------------------------------------------------*/

async function fetchWatchProviders(id, type) {
  try {
    const r = await apiGet("/api/providers", {
      id,
      type: asType(type)
    });

    // ✅ API already returns final shape
    if (Array.isArray(r?.providers)) {
      return {
        providers: r.providers,
        link: r.link || null
      };
    }

    // Fallback safety
    return { providers: [], link: null };
  } catch (e) {
    console.error("Watch providers failed:", e);
    return { providers: [], link: null };
  }
}
function closeAllWatchDropdowns(root = document) {
  root.querySelectorAll(".watchDropdown").forEach((d) => d.remove());
}

function renderWatchMenu(data) {
  const { providers, link } = data || {};

  if (!Array.isArray(providers) || providers.length === 0) {
    return `
      <div class="watchMenu">
        <div class="watchEmptyTitle">Not available to stream in Canada</div>
        <div class="watchEmptySub">Try another title, or check TMDb for updates.</div>
      </div>
    `;
  }

  const safeLink = link ? esc(link) : "#";
  const logoBase = "https://image.tmdb.org/t/p/w92";

  const sorted = providers.slice().sort((a, b) => {
    const ap = Number(a?.display_priority ?? 9999);
    const bp = Number(b?.display_priority ?? 9999);
    return ap - bp;
  });

  return `
    <div class="watchMenu">
      <div class="watchHeader">
        <div class="watchTitle">Watch in Canada</div>
        <div class="watchSub">Select a provider</div>
      </div>

      <div class="watchList">
        ${sorted.map(p => {
          const name = esc(p?.provider_name || "Provider");
          const logo = p?.logo_path
            ? `<img class="watchLogo" src="${logoBase}${esc(p.logo_path)}" alt="${name}" loading="lazy" />`
            : `<div class="watchLogoFallback">🎬</div>`;

          return `
            <a class="watchItem"
               href="${safeLink}"
               target="_blank"
               rel="noopener">
              ${logo}
              <div class="watchItemText">
                <div class="watchName">${name}</div>
								</div>
            </a>
          `;
        }).join("")}
      </div>

      <a class="watchFooterBtn" href="${safeLink}" target="_blank" rel="noopener">
        View full watch page
      </a>
    </div>
  `;
}

function toggleWatchDropdown(anchorBtn, html) {
  if (!anchorBtn) return;

  // If a dropdown already exists right after this button, toggle it off
  const next = anchorBtn.nextElementSibling;
  if (next && next.classList.contains("watchDropdown")) {
    next.remove();
    return;
  }

  // Close any others anywhere (prevents multiple open)
  closeAllWatchDropdowns(document);

  const box = document.createElement("div");
  box.className = "watchDropdown";
  box.innerHTML = html;
  anchorBtn.after(box);

  const cleanup = () => {
    box.remove();
    document.removeEventListener("pointerdown", onDoc, true);
    document.removeEventListener("keydown", onKey);
  };

  const onKey = (e) => {
    if (e.key === "Escape") cleanup();
  };

  const onDoc = (e) => {
    // If tap is inside dropdown or on the button, do nothing
    if (box.contains(e.target) || anchorBtn.contains(e.target)) return;
    cleanup();
  };

  // 🔑 Delay binding so the opening tap doesn't instantly close it
  setTimeout(() => {
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
  }, 0);
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
   Read-more toggle
------------------------------*/
function makeReadMoreHTML(fullText = "", clampLines = 4) {
  const t = String(fullText || "").trim();
  if (!t) return { html: `<div class="overviewText muted">No description available.</div>`, hasToggle: false };

  const safe = esc(t);
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
/* -----------------------------------------------------------
   1) Mobile: auto-scroll to Target
-----------------------------------------------------------*/
function scrollToTarget() {
  const el = els.target?.closest(".card") || els.target;
  if (!el) return;
  // smooth scroll on mobile after selecting something
  setTimeout(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}
/* -----------------------------------------------------------
   SECTION A.6: Genre Grid (Discover Mode)
----------------------------------------------------------- */
/* -----------------------------------------------------------
   Mobile: Auto-hide top header when idle
----------------------------------------------------------- */
function enableMobileAutoHideHeader() {
  const header = document.querySelector(".top");
  if (!header) return;

  // Only activate on touch devices
  const isTouch =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (!isTouch) return;

  let hideTimer = null;
const IDLE_DELAY = 1000; // ms before hiding

  const showHeader = () => {
    header.classList.remove("auto-hidden");
    resetTimer();
  };

  const hideHeader = () => {
    header.classList.add("auto-hidden");
  };

  const resetTimer = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideHeader, IDLE_DELAY);
  };

  // Show on any interaction
  ["touchstart", "scroll", "click"].forEach(evt => {
    document.addEventListener(evt, showHeader, { passive: true });
  });

  // Don’t hide while typing
  document.addEventListener("focusin", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      showHeader();
    }
  });

  resetTimer();
}
/* -----------------------------------------------------------
   SECTION A.6: Genres Grid (Discover Mode) — Popular-style w/ posters
----------------------------------------------------------- */

async function hydrateGenrePosters(container, presets) {
  if (!container) return;

  // Concurrency limit so you don’t fire 50 requests at once
  const CONCURRENCY = 4;
  let i = 0;

  async function worker() {
    while (i < presets.length) {
      const idx = i++;
      const g = presets[idx];
      const btn = container.querySelector(`.genreCard[data-idx="${idx}"]`);
      if (!btn) continue;

      try {
        const data = await apiGet("/api/discover", {
          type: g.type || "both",
          keywords: g.keywords || "",
          genres: g.genres || "",
          sort: "popularity.desc",
          minVotes: 30,
          region: "CA"
        });

        const first = (data.items || [])[0];
        const posterEl = btn.querySelector(".popPoster");

        if (first?.poster && posterEl) {
          // swap placeholder -> image
          posterEl.outerHTML = `<img class="popPoster" src="${esc(first.poster)}" loading="lazy" alt="${esc(g.name)} poster" />`;
        }
      } catch {
        // keep placeholder if it fails
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}
async function discoverOnce({ type, keywords, genres, minVotes = 30 }) {
  return apiGet("/api/discover", {
    type,
    keywords,
    genres,
    sort: "popularity.desc",
    minVotes,
    region: "CA",
  });
}

async function discoverCategory({ type, keywords, genres }) {
  // 1) If backend doesn't understand "both", do both ourselves
  const doType = async (t, minVotes, kw, gn) => {
    const r = await discoverOnce({ type: t, keywords: kw, genres: gn, minVotes });
    return (r?.items || []).map(x => ({ ...x, type: asType(x.type || t, t) }));
  };

  // A) normal pass
  let items = [];
  try {
    if (type === "both") {
      const [m, tv] = await Promise.all([
        doType("movie", 30, keywords, genres),
        doType("tv", 30, keywords, genres),
      ]);
      items = [...m, ...tv];
    } else {
      items = await doType(type, 30, keywords, genres);
    }
  } catch {}

  // B) relax votes if empty
  if (!items.length) {
    try {
      if (type === "both") {
        const [m, tv] = await Promise.all([
          doType("movie", 5, keywords, genres),
          doType("tv", 5, keywords, genres),
        ]);
        items = [...m, ...tv];
      } else {
        items = await doType(type, 5, keywords, genres);
      }
    } catch {}
  }

  // C) drop keywords if still empty (keywords commonly break discover)
  if (!items.length) {
    try {
      if (type === "both") {
        const [m, tv] = await Promise.all([
          doType("movie", 5, "", genres),
          doType("tv", 5, "", genres),
        ]);
        items = [...m, ...tv];
      } else {
        items = await doType(type, 5, "", genres);
      }
    } catch {}
  }

  // D) final fallback: search by keywords/name
  if (!items.length) {
    const q =
      (keywords || "").split(",")[0]?.trim() ||
      (genres ? "" : "") ||
      "popular";
    try {
      const s = await apiGet("/api/search", { q });
      items = (s?.items || s?.results || []).map(x => ({ ...x, type: asType(x.type, "movie") }));
    } catch {}
  }

  // de-dupe by type+id, keep first
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = `${asType(it.type)}:${it.id}`;
    if (!it?.id || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
function renderGenres(genres = []) {
  const container = document.getElementById("genreGrid");
  if (!container) return;

  container.innerHTML = `
    <div class="popGrid">
      ${genres.map((g, idx) => `
        <button
          class="popCard genreCard"
          type="button"
          data-idx="${idx}"
          data-mode="discover"
          data-type="${g.type || "both"}"
          data-keywords="${g.keywords || ""}"
          data-genres="${g.genres || ""}"
        >
          <div class="popPoster placeholder"></div>
          <div class="popTitle">${esc(g.name)}</div>
        </button>
      `).join("")}
    </div>
  `;

  // Click behavior (your discover logic)
  container.querySelectorAll(".genreCard").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const type = btn.getAttribute("data-type") || "both";
    const keywords = btn.getAttribute("data-keywords") || "";
    const genres = btn.getAttribute("data-genres") || "";

    clearLists();
    setMeta("Loading category…", false);

    try {
      const items = await discoverCategory({ type, keywords, genres });

      renderMatches(items);

      const first = items[0];
      if (!first?.id) {
        renderTarget(null);
        setMeta("No results found for this category.", true);
        return;
      }

      await loadById(first.id, first.type);
      scrollToTarget();
    } catch (e) {
      renderTarget(null);
      setMeta(`Category failed. (${e.status || "?"} – ${e.message})`, true);
    }
  });
});

  // Poster hydration (popular-style posters)
  hydrateGenrePosters(container, genres);
}

/* -----------------------------------------------------------
   SECTION B: renderTarget() (FULL REPLACE)
-----------------------------------------------------------*/

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
      </div>

      <div class="metaRow">
        <div class="genresText">${esc(genres || "—")}</div>
        <div class="typeText muted">${esc(safeUpper(type))}</div>
      </div>

      <div class="overviewBlock">
        ${overviewBits.html}

        <div class="targetActions">
          <button id="addWatch" class="btn sm" type="button">Add</button>
          <button id="watchNow" class="btn sm" type="button">Watch</button>
          <button id="copyLink" class="btn sm" type="button">Share</button>
          <button id="openImdb" class="btn sm" type="button">TMDb</button>
        </div>
      </div>
    </div>
  `;

  wireReadMore(els.target);

  // wire target action buttons
  const btnAdd = document.getElementById("addWatch");
  const btnWatch = document.getElementById("watchNow");
  const btnShare = document.getElementById("copyLink");
  const btnTmdb = document.getElementById("openImdb");

  if (btnTmdb) {
    btnTmdb.onclick = () => {
      window.open(`https://www.themoviedb.org/${type}/${encodeURIComponent(m.id)}`, "_blank");
    };
  }

if (btnShare) {
  btnShare.onclick = async () => {
    const u = new URL(location.origin);
    u.pathname = `/t/${type}/${m.id}`;
    const shareUrl = u.toString();

    try {
      await navigator.clipboard.writeText(shareUrl);
      await fmAlert("Link copied");
    } catch {
      await fmAlert("Copy blocked");
    }
  };
}

  if (btnAdd) {
    btnAdd.onclick = () => addToWatchlist({ ...m, type });
  }

  if (btnWatch) {
  btnWatch.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // important on mobile
    closeAllWatchDropdowns(document);

    const data = await fetchWatchProviders(m.id, type);
    toggleWatchDropdown(btnWatch, renderWatchMenu(data));
  };
}

  // trailer
  (async () => {
    try {
      const key = m.trailerKey || (await fetchTrailerKey(m.id, type));
      renderTrailerEmbed(key);
    } catch {
      renderTrailerEmbed("");
    }
  })();

  setMeta(`Selected: ${m.title}`, false);
}

/* -----------------------------------------------------------
   SECTION C: renderSimilar() (FULL REPLACE)
-----------------------------------------------------------*/

function renderSimilar(items) {
  const cleaned = (items || [])
  .filter(m => m && m.title)
  .filter(m => !/^untitled$/i.test(m.title.trim()));

const baseTitle =
  els.target?.querySelector(".title")?.textContent || "";

const baseYear =
  Number(els.target?.querySelector(".title span")?.textContent?.replace(/\D/g, "")) || null;

const list = sortByFranchise(baseTitle, cleaned, baseYear).slice(0, 20);
  if (!els.results) return;

  if (!list.length) {
    els.results.innerHTML = `<div class="muted">No similar titles found (try another title).</div>`;
    return;
  }

  els.results.innerHTML = list
    .map((m) => {
      const type = asType(m.type, "movie");

      const poster = m.poster
        ? `<img class="poster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
        : `<div class="poster placeholder"></div>`;

      const genres = Array.isArray(m.genres)
        ? m.genres
            .map((g) => genreNameById.get(Number(g)) || "")
            .filter(Boolean)
            .slice(0, 4)
            .join(", ")
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
            </div>

            <div class="metaRow">
              <div class="genresText">${esc(genres || "—")}</div>
              <div class="typeText muted">${esc(safeUpper(type))}</div>
            </div>

            <div class="overviewBlock">
              ${overviewBits.html}

              <div class="simActions">
                <button class="btn sm openBtn" type="button">Open</button>
                <button class="btn sm watchBtn" type="button">Watch</button>
                <button class="btn sm trailerBtn" type="button">Trailer</button>
                <button class="btn sm tmdbBtn" type="button">TMDb</button>
              </div>

              <div class="miniTrailer hidden"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  wireReadMore(els.results);

  els.results.querySelectorAll(".simCard").forEach((card) => {
    const id = card.getAttribute("data-id");
    const type = asType(card.getAttribute("data-type") || "movie", "movie");

    const openBtn = card.querySelector(".openBtn");
    const watchBtn = card.querySelector(".watchBtn");
    const trailerBtn = card.querySelector(".trailerBtn");
    const tmdbBtn = card.querySelector(".tmdbBtn");
    const mini = card.querySelector(".miniTrailer");

    openBtn?.addEventListener("click", () => loadById(id, type));

    tmdbBtn?.addEventListener("click", () =>
      window.open(`https://www.themoviedb.org/${type}/${encodeURIComponent(id)}`, "_blank")
    );

    watchBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const data = await fetchWatchProviders(id, type);
  toggleWatchDropdown(watchBtn, renderWatchMenu(data));
});

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
          await fmAlert("No trailer found");
          trailerBtn.textContent = "Trailer";
          return;
        }

        mini.innerHTML = `<iframe loading="lazy" src="https://www.youtube.com/embed/${encodeURIComponent(
          key
        )}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        mini.classList.remove("hidden");
        trailerBtn.textContent = "Hide trailer";
      } catch (e) {
        await fmAlert("Trailer failed");
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
const query = (els.q?.value || "").toLowerCase().trim();

const list = (items || [])
  .filter(m => m && m.title)
  .filter(m => !/^untitled$/i.test(m.title.trim()))
  .map(m => {
    const title = m.title.toLowerCase();

    let score = 0;

    // 1️⃣ exact match
    if (title === query) score += 1000;

    // 2️⃣ starts with query
    else if (title.startsWith(query)) score += 800;

    // 3️⃣ contains full query
    else if (title.includes(query)) score += 600;

    // 4️⃣ word-based relevance (blade + 2)
    query.split(" ").forEach(word => {
      if (title.includes(word)) score += 100;
    });

    return { ...m, _score: score };
  })
  .sort((a, b) => b._score - a._score)
  .slice(0, 10);
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

  const filtered = (items || [])
  .filter(m => m && m.title)
  .filter(m => !/^untitled$/i.test(m.title.trim()));
	

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
		scrollToTarget();
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
   Watchlist Logic
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
  fmAlert("Added to watchlist");
}

/* -----------------------------------------------------------
   SECTION D: openWatchlist() (FULL REPLACE)
-----------------------------------------------------------*/

function openWatchlist() {
  const list = loadWatchlist();
  if (!els.watchlist) return;

  els.watchlist.innerHTML = list.length
    ? list
        .map((m) => {
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

                <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                  <button class="btn sm" type="button" data-id="${esc(m.id)}" data-type="${esc(type)}">Open</button>

                  <button class="btn sm watchBtn" type="button" data-watch-id="${esc(m.id)}" data-watch-type="${esc(
            type
          )}">Watch</button>

                  <button class="btn sm delete" type="button" data-del-id="${esc(m.id)}" data-del-type="${esc(
            type
          )}">Delete</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">No watchlist items yet.</div>`;

  // Open
  els.watchlist.querySelectorAll("button[data-id]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const type = asType(b.getAttribute("data-type") || "movie", "movie");
      closeWatchlist();
      loadById(id, type);
    });
  });

  // Delete
  els.watchlist.querySelectorAll("button[data-del-id]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-del-id");
      const type = asType(b.getAttribute("data-del-type") || "movie", "movie");
      deleteFromWatchlist(id, type);
    });
  });

  // Watch
  // Watch (WATCHLIST ONLY — scoped + auto-close)
els.watchlist.querySelectorAll("button[data-watch-id]").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const id = btn.dataset.watchId;
    const type = asType(btn.dataset.watchType || "movie", "movie");
    const row = btn.closest(".watchItem");
    if (!row) return;

    // 🔑 Close any existing watch dropdowns (watchlist only)
    els.watchlist.querySelectorAll(".watchDropdown").forEach(d => d.remove());

    const data = await fetchWatchProviders(id, type);

const dropdown = document.createElement("div");
dropdown.className = "watchDropdown";
dropdown.innerHTML = renderWatchMenu(data);

// 🔑 insert directly AFTER the button row
btn.closest("div").after(dropdown);

    // 🔑 Auto-close when tapping anywhere else
    const closeOnOutside = (ev) => {
      if (row.contains(ev.target)) return;
      dropdown.remove();
      document.removeEventListener("click", closeOnOutside, true);
    };

    // delay prevents immediate self-close
    setTimeout(() => {
      document.addEventListener("click", closeOnOutside, true);
    }, 0);
  });
});

  els.modal?.classList.remove("hidden");
}

/* -----------------------------
   Popular Feed (50 + 50)
------------------------------*/
let popularCache = { movies: [], tv: [] };
let popularLoadedOnce = false;

async function fetchPopularPagesTo50() {
  const moviesOut = [];
  const tvOut = [];

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

  // 3 columns is your base layout on mobile → pad to 3 so no “missing” card gaps
  const baseCols = 3;

  const clean = (items || []).filter(Boolean).slice(0, POPULAR_COUNT);
  const list = padToMultiple(clean, baseCols);

  if (!clean.length) {
    container.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="popGrid">
      ${list.map((m) => {
        // Placeholder to fill the last row cleanly
        if (!m) {
          return `
            <div class="popCard is-placeholder" aria-hidden="true"
                 style="opacity:0; pointer-events:none;">
              <div class="popPoster placeholder"></div>
              <div class="popTitle"></div>
            </div>
          `;
        }

        return `
          <button
            class="popCard"
            type="button"
            data-id="${esc(m.id)}"
            data-type="${esc(asType(m.type || m.media_type, "movie"))}"
          >
            ${
              m.poster
                ? `<img class="popPoster" src="${esc(m.poster)}" loading="lazy" alt="${esc(m.title)} poster" />`
                : `<div class="popPoster placeholder"></div>`
            }
            <div class="popTitle">${esc(m.title)}</div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll(".popCard:not(.is-placeholder)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const type = asType(btn.getAttribute("data-type") || "movie", "movie");
      if (id) loadById(id, type);
    });
  });

  // 🔑 After render, shrink titles to fit their fixed-height box
  fitPopTitles(container);
}

async function loadPopularNow() {
  if (!els.popularMovies && !els.popularTv) return;

  if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Loading…</div>`;
  if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Loading…</div>`;

  try {
    const { movies, tv } = await fetchPopularPagesTo50();

    renderPopularGrid(els.popularMovies, movies);
    renderPopularGrid(els.popularTv, tv);

    popularCache.movies = movies.slice();
    popularCache.tv = tv.slice();
    popularLoadedOnce = true;

  } catch (e) {
    if (els.popularMovies) els.popularMovies.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
    if (els.popularTv) els.popularTv.innerHTML = `<div class="muted">Popular feed unavailable.</div>`;
  }
}

/* -----------------------------
   Random (CLIENT-SIDE)
------------------------------*/
async function doRandom() {
  clearLists();
  setMeta("Picking random…", false);

  try {
    if (!popularLoadedOnce) {
      const { movies, tv } = await fetchPopularPagesTo50();
      popularCache.movies = movies;
      popularCache.tv = tv;
      popularLoadedOnce = true;
    }

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
   Init UI
------------------------------*/
function initUI() {
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
      setActiveMode("none");
      doSearch();
    }
  });

  els.searchBtn?.addEventListener("click", () => {
    setActiveMode("none");
    doSearch();
  });

  document.addEventListener("click", (e) => {
    if (!els.suggest?.contains(e.target) && e.target !== els.q) {
      els.suggest?.classList.add("hidden");
    }
  });

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

  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  const type = asType(url.searchParams.get("type") || "movie", "movie");
  if (id) loadById(id, type);

    loadPopularNow();
		renderGenres(GENRE_PRESETS);
  setActiveMode("none");
	  enableMobileAutoHideHeader();
}
/* -----------------------------------------------------------
   SECTION E: Bottom Enhancements (FULL REPLACE)
-----------------------------------------------------------*/

function lockScroll(lock = true) {
  document.body.style.overflow = lock ? "hidden" : "";
}

async function deleteFromWatchlist(id, type) {
  const list = loadWatchlist();
  const idx = list.findIndex(
    x => String(x.id) === String(id) && x.type === type
  );
  if (idx === -1) return;

  list.splice(idx, 1);
  saveWatchlist(list);
  openWatchlist(); // re-render

  // ✅ Match the same modal style used for "Added to watchlist"
  await fmAlert("Removed from watchlist");
}

// NOTE: The previous "Undo delete" bar was removed so the delete feedback
// matches the same UI system as the rest of the app (fmAlert/fmConfirm).

const oldOpenWatchlist = openWatchlist;
openWatchlist = function () {
  oldOpenWatchlist();
  lockScroll(true);
};

function closeWatchlist() {
  els.modal?.classList.add("hidden");
  lockScroll(false);
  closeAllWatchDropdowns(document);
}

/* -----------------------------------------------------------
   Watchlist modal: clear button (styled confirm + toast)
----------------------------------------------------------- */

function ensureClearButton() {
  const top = document.querySelector(".modalTop");
  if (!top) return;

  // already added?
  if (document.getElementById("clearBtn")) return;

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn sm delete";
  clearBtn.id = "clearBtn";
  clearBtn.type = "button";
  clearBtn.textContent = "Clear";

  clearBtn.onclick = async () => {
    const ok = await fmConfirm("Clear entire watchlist?");
    if (!ok) {
      await fmAlert("Cancelled");
      return;
    }

    saveWatchlist([]);
    openWatchlist(); // re-render
    await fmAlert("Watchlist cleared");
  };

  // insert before Close
  top.insertBefore(clearBtn, els.closeModal);
}

/* -----------------------------------------------------------
   Init (run once)
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  renderTarget(null);
  clearLists();
  setMeta("Ready.", false);

  // add Clear button once the modal header exists
  ensureClearButton();
});
/* ============================================================
   MATRIX RAIN BACKGROUND — FULLSCREEN + FIXED
   ============================================================ */

(function matrixRain(){
  const canvas = document.getElementById("matrixRain");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const chars =
    "アァカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%";

  let fontSize = 14;
  let columns = 0;
  let drops = [];

  function resizeMatrix() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bufferCols = 10; // 5 extra on each side

columns = Math.floor(width / fontSize) + bufferCols;
drops = Array(columns).fill(1);
  }

  function draw() {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // fade layer (trail)
    // subtle glass shade to match cards
ctx.fillStyle = "rgba(10, 14, 28, 0.12)";
ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(34, 211, 238, 0.85)";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(text, x, y);

      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i]++;
    }
  }

  resizeMatrix();
  window.addEventListener("resize", resizeMatrix);
  window.addEventListener("orientationchange", resizeMatrix);

  setInterval(draw, 33); // ~30 FPS
})();
