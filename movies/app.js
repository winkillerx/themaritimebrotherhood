// app.js — base-path safe (works at / or at /movies)

const $ = (sel) => document.querySelector(sel);

const els = {
  q: $("#q"),
  suggest: $("#suggest"),
  go: $("#go"),
  minRating: $("#minRating"),
  minRatingVal: $("#minRatingVal"),
  genre: $("#genre"),
  year: $("#year"),
  meta: $("#meta"),
  target: $("#target"),
  results: $("#results"),
  trailer: $("#trailer"),
  targetActions: $("#targetActions"),
  addWatch: $("#addWatch"),
  copyLink: $("#copyLink"),
  openImdb: $("#openImdb"),
  watchlist: $("#watchlist"),
  watchlistBtn: $("#watchlistBtn"),
  random: $("#random"),
  modal: $("#modal"),
  closeModal: $("#closeModal"),
};

function getBasePrefix() {
  // If page is served at /movies (or /movies/whatever), use "/movies" as prefix.
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first === "movies" ? "/movies" : "";
}

const BASE = getBasePrefix();

async function apiGet(path, params = {}) {
  const url = new URL(`${location.origin}${BASE}/api/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });

  // Vercel 404 returns HTML sometimes; surface a clean error
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    const msg = body && body.includes("NOT_FOUND")
      ? `API ${res.status} — NOT_FOUND (wrong API path or missing route)`
      : `API ${res.status} — request failed`;
    throw new Error(msg);
  }

  return res.json();
}

function setMeta(msg) {
  els.meta.textContent = msg || "";
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSuggest(items) {
  if (!items || !items.length) {
    els.suggest.innerHTML = "";
    els.suggest.style.display = "none";
    return;
  }

  els.suggest.style.display = "block";
  els.suggest.innerHTML = items
    .slice(0, 8)
    .map((m) => {
      const year = m.year ? ` (${m.year})` : "";
      return `<button class="sugg" type="button" data-id="${m.id}">${escapeHtml(m.title)}${escapeHtml(year)}</button>`;
    })
    .join("");

  els.suggest.querySelectorAll("button.sugg").forEach((btn) => {
    btn.addEventListener("click", async () => {
      els.suggest.style.display = "none";
      els.q.value = btn.textContent.trim();
      await runSearch(btn.getAttribute("data-id"));
    });
  });
}

function renderTarget(m) {
  if (!m) {
    els.target.innerHTML = `<div class="muted">No selection yet.</div>`;
    els.targetActions.style.display = "none";
    return;
  }

  const title = escapeHtml(m.title || "Unknown");
  const year = m.year ? ` • ${escapeHtml(m.year)}` : "";
  const rating = (m.rating !== undefined && m.rating !== null)
    ? ` • ⭐ ${escapeHtml(m.rating)}`
    : "";

  const overview = m.overview ? `<div class="small muted" style="margin-top:10px">${escapeHtml(m.overview)}</div>` : "";

  els.target.innerHTML = `
    <div class="card">
      <div class="h3">${title}${year}${rating}</div>
      ${overview}
    </div>
  `;

  els.targetActions.style.display = "flex";

  // Buttons
  els.openImdb.onclick = () => {
    if (m.imdb) window.open(m.imdb, "_blank");
    else setMeta("No IMDb link for this title.");
  };

  els.copyLink.onclick = async () => {
    const share = new URL(location.href);
    share.searchParams.set("q", m.title || "");
    share.searchParams.set("id", m.id || "");
    try {
      await navigator.clipboard.writeText(share.toString());
      setMeta("Copied share link ✅");
    } catch {
      setMeta("Could not copy link (iOS sometimes blocks clipboard).");
    }
  };

  els.addWatch.onclick = () => {
    addToWatchlist(m);
    renderWatchlist();
    setMeta("Added to watchlist ✅");
  };
}

function renderSimilar(list) {
  if (!list || !list.length) {
    els.results.innerHTML = `<div class="muted">No similar titles found (try another movie).</div>`;
    return;
  }

  els.results.innerHTML = list
    .slice(0, 20)
    .map((m) => {
      const year = m.year ? ` (${escapeHtml(m.year)})` : "";
      const rating = (m.rating !== undefined && m.rating !== null) ? ` — ⭐ ${escapeHtml(m.rating)}` : "";
      return `
        <button class="row" type="button" data-id="${m.id}">
          <span class="t">${escapeHtml(m.title)}${year}</span>
          <span class="r">${rating}</span>
        </button>
      `;
    })
    .join("");

  els.results.querySelectorAll("button.row").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await runSearch(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// Watchlist (localStorage)
const WL_KEY = "neonsimilar_watchlist_v1";

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WL_KEY) || "[]");
  } catch {
    return [];
  }
}
function setWatchlist(list) {
  localStorage.setItem(WL_KEY, JSON.stringify(list));
}
function addToWatchlist(movie) {
  const list = getWatchlist();
  if (!movie?.id) return;
  if (list.some((x) => String(x.id) === String(movie.id))) return;
  list.unshift({ id: movie.id, title: movie.title, year: movie.year, rating: movie.rating });
  setWatchlist(list.slice(0, 100));
}
function renderWatchlist() {
  const list = getWatchlist();
  if (!list.length) {
    els.watchlist.innerHTML = `<div class="muted">Watchlist is empty.</div>`;
    return;
  }
  els.watchlist.innerHTML = list
    .slice(0, 30)
    .map((m) => `<div class="wl">${escapeHtml(m.title)}${m.year ? ` (${escapeHtml(m.year)})` : ""}</div>`)
    .join("");
}

async function runSearch(optionalId = "") {
  const q = (els.q.value || "").trim();
  if (!q && !optionalId) {
    setMeta("Type a movie title first.");
    return;
  }

  setMeta("Searching…");

  try {
    // If optionalId is provided, prefer resolve -> similar flow
    let target = null;

    if (optionalId) {
      // Try to resolve by ID (if your api/resolve.js supports it)
      try {
        const resolved = await apiGet("resolve", { id: optionalId });
        target = resolved?.target || resolved?.movie || resolved?.item || null;
      } catch {
        // fall back to search by query
      }
    }

    if (!target) {
      const data = await apiGet("search", { q });
      target = data?.target || (data?.items && data.items[0]) || null;
    }

    renderTarget(target);

    if (!target?.id) {
      renderSimilar([]);
      setMeta("No match found. Try a different title.");
      return;
    }

    // Similar list (if your api/similar.js exists)
    try {
      const minRating = Number(els.minRating.value || 0);
      const genre = els.genre.value || "";
      const year = els.year.value || "";

      const sim = await apiGet("similar", { id: target.id, minRating, genre, year });
      const list =
        sim?.similar ||
        sim?.items ||
        sim?.results ||
        [];

      renderSimilar(list);
      setMeta("");
    } catch (e) {
      // If similar endpoint fails, still keep target working
      renderSimilar([]);
      setMeta(`Loaded target ✅ (Similar failed: ${e.message})`);
    }
  } catch (e) {
    renderTarget(null);
    renderSimilar([]);
    setMeta(`Search failed. (${e.message})`);
  }
}

// Suggest (debounced)
let t = null;
els.q.addEventListener("input", () => {
  clearTimeout(t);
  const q = (els.q.value || "").trim();
  if (!q) {
    renderSuggest([]);
    return;
  }
  t = setTimeout(async () => {
    try {
      const data = await apiGet("suggest", { q });
      const items = data?.items || data?.results || [];
      renderSuggest(items);
    } catch {
      renderSuggest([]);
    }
  }, 200);
});

// Rating slider label
els.minRating.addEventListener("input", () => {
  els.minRatingVal.textContent = `${els.minRating.value}/10`;
});

// Buttons
els.go.addEventListener("click", () => runSearch());
els.random.addEventListener("click", async () => {
  setMeta("Random…");
  try {
    const data = await apiGet("random", {});
    const target = data?.target || data?.movie || data?.item || null;
    renderTarget(target);

    if (target?.id) {
      try {
        const sim = await apiGet("similar", { id: target.id });
        renderSimilar(sim?.similar || sim?.items || sim?.results || []);
      } catch {
        renderSimilar([]);
      }
    } else {
      renderSimilar([]);
    }
    setMeta("");
  } catch (e) {
    setMeta(`Random failed. (${e.message})`);
  }
});

els.watchlistBtn.addEventListener("click", () => {
  renderWatchlist();
  els.modal.style.display = "block";
});
els.closeModal.addEventListener("click", () => {
  els.modal.style.display = "none";
});
els.modal.addEventListener("click", (ev) => {
  if (ev.target === els.modal) els.modal.style.display = "none";
});

// On load: render watchlist + optional query
renderWatchlist();
(function bootFromUrl() {
  const u = new URL(location.href);
  const q = u.searchParams.get("q");
  const id = u.searchParams.get("id");
  if (q) els.q.value = q;
  if (q || id) runSearch(id || "");
})();
