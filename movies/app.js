/* NEONSIMILAR /movies
   - Uses local Node proxy endpoints:
     /api/search?q=
     /api/movie/:id
     /api/movie/:id/similar
     /api/movie/:id/videos
     /api/movie/:id/keywords
     /api/movie/:id/credits
     /api/genres
     /api/random
*/

const $ = (s) => document.querySelector(s);

const q = $("#q");
const suggest = $("#suggest");
const go = $("#go");
const randomBtn = $("#random");

const targetEl = $("#target");
const trailerEl = $("#trailer");
const resultsEl = $("#results");
const meta = $("#meta");

const minRating = $("#minRating");
const minRatingVal = $("#minRatingVal");
const genreSel = $("#genre");
const yearSel = $("#year");

const targetActions = $("#targetActions");
const addWatch = $("#addWatch");
const copyLink = $("#copyLink");
const openImdb = $("#openImdb");

const watchlistBtn = $("#watchlistBtn");
const modal = $("#modal");
const closeModal = $("#closeModal");
const watchlistEl = $("#watchlist");

const IMG = (path, size="w342") => path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

let currentTarget = null;
let genreMap = new Map(); // id->name
let targetKeywords = new Set();
let targetCast = new Set();
let imdbUrl = null;

const WATCH_KEY = "ns_watchlist_v1";

function norm(s){ return (s || "").toString().toLowerCase().trim(); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

async function api(url){
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getWatchlist(){
  try { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); }
  catch { return []; }
}
function setWatchlist(list){
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
}

function clearSuggest(){
  suggest.classList.add("hidden");
  suggest.innerHTML = "";
}

function showSuggest(items){
  if (!items.length) return clearSuggest();
  suggest.classList.remove("hidden");
  suggest.innerHTML = items.slice(0, 6).map((m) => {
    const y = (m.release_date || "").slice(0,4) || "????";
    const r = Number(m.vote_average || 0).toFixed(1);
    return `
      <div class="item" role="option" tabindex="0" data-id="${m.id}">
        <div><strong>${escapeHtml(m.title)}</strong> <span class="small">(${y}) • ★ ${escapeHtml(r)}</span></div>
        <div class="small">${escapeHtml((m.overview || "").slice(0, 90))}${(m.overview || "").length > 90 ? "…" : ""}</div>
      </div>
    `;
  }).join("");

  suggest.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", async () => {
      const id = el.getAttribute("data-id");
      await pickTarget(id, true);
    });
    el.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const id = el.getAttribute("data-id");
        await pickTarget(id, true);
      }
    });
  });
}

function escapeHtml(str){
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("click", (e) => {
  if (!suggest.contains(e.target) && e.target !== q) clearSuggest();
});

q.addEventListener("input", async () => {
  const text = q.value.trim();
  if (text.length < 2) return clearSuggest();
  try{
    const data = await api(`/api/search?q=${encodeURIComponent(text)}`);
    showSuggest(data.results || []);
  } catch {
    clearSuggest();
  }
});

q.addEventListener("keydown", (e) => {
  if (e.key === "Enter"){ e.preventDefault(); doSearch(); }
  if (e.key === "Escape") clearSuggest();
});

go.addEventListener("click", doSearch);

randomBtn.addEventListener("click", async () => {
  const pick = await api(`/api/random`);
  await pickTarget(pick.id, true);
});

minRating.addEventListener("input", () => {
  minRatingVal.textContent = minRating.value;
  if (currentTarget) loadSimilar(currentTarget.id);
});

genreSel.addEventListener("change", () => {
  if (currentTarget) loadSimilar(currentTarget.id);
});

yearSel.addEventListener("change", () => {
  if (currentTarget) loadSimilar(currentTarget.id);
});

watchlistBtn.addEventListener("click", () => {
  renderWatchlist();
  modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

addWatch.addEventListener("click", () => {
  if (!currentTarget) return;
  const list = getWatchlist();
  if (!list.some(x => String(x.id) === String(currentTarget.id))) {
    list.unshift({
      id: currentTarget.id,
      title: currentTarget.title,
      poster_path: currentTarget.poster_path || null,
      release_date: currentTarget.release_date || null,
      vote_average: currentTarget.vote_average || null
    });
    setWatchlist(list.slice(0, 100));
    meta.textContent = `Added to watchlist: ${currentTarget.title}`;
  } else {
    meta.textContent = `Already in watchlist: ${currentTarget.title}`;
  }
});

copyLink.addEventListener("click", async () => {
  if (!currentTarget) return;
  const u = new URL(window.location.href);
  u.searchParams.set("m", String(currentTarget.id));
  const share = u.toString();
  try{
    await navigator.clipboard.writeText(share);
    meta.textContent = "Share link copied.";
  } catch {
    prompt("Copy this link:", share);
  }
});

openImdb.addEventListener("click", () => {
  if (!imdbUrl) {
    meta.textContent = "IMDb link not available for this title.";
    return;
  }
  window.open(imdbUrl, "_blank", "noopener,noreferrer");
});


(function fillYears(){
  const now = new Date().getFullYear();
  for (let y = now; y >= 2000; y--){
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    yearSel.appendChild(opt);
  }
  yearSel.value = "2000";
})();

async function loadGenres(){
  try{
    const data = await api("/api/genres");
    const genres = data.genres || [];
    for (const g of genres) genreMap.set(Number(g.id), g.name);

    for (const g of genres){
      const opt = document.createElement("option");
      opt.value = String(g.id);
      opt.textContent = g.name;
      genreSel.appendChild(opt);
    }
  } catch {
    // optional
  }
}
loadGenres();

async function doSearch(){
  const text = q.value.trim();
  if (!text) return;

  const data = await api(`/api/search?q=${encodeURIComponent(text)}`);
  const results = data.results || [];
  clearSuggest();

  if (!results.length){
    meta.textContent = "No match found (2000+ filter is on). Try another title.";
    return;
  }

  const exact = results.find(m => norm(m.title) === norm(text));
  await pickTarget((exact || results[0]).id, true);
}

function passesFilters(movie){
  const min = Number(minRating.value || 0);
  const r = Number(movie.vote_average || 0);
  if (r < min) return false;

  const g = genreSel.value;
  if (g){
    const ids = movie.genre_ids || [];
    if (!ids.includes(Number(g))) return false;
  }

  const yFilter = yearSel.value;
  const y = Number((movie.release_date || "").slice(0,4) || 0);

  if (yFilter === "2000") return y >= 2000;
  return y === Number(yFilter);
}

async function pickTarget(id, updateUrl){
  clearSuggest();
  const details = await api(`/api/movie/${id}`);
  currentTarget = details;

  if (updateUrl){
    const u = new URL(window.location.href);
    u.searchParams.set("m", String(details.id));
    window.history.replaceState({}, "", u.toString());
  }

  renderTarget(details);
  targetActions.classList.remove("hidden");

  const [kw, cr, ex] = await Promise.allSettled([
    api(`/api/movie/${details.id}/keywords`),
    api(`/api/movie/${details.id}/credits`),
    api(`/api/movie/${details.id}/external_ids`)
  ]);

  targetKeywords = new Set();
  if (kw.status === "fulfilled") {
    for (const k of (kw.value.keywords || [])) targetKeywords.add(norm(k.name));
  }

  targetCast = new Set();
  imdbUrl = null;
  if (cr.status === "fulfilled") {
    for (const p of (cr.value.cast || []).slice(0, 12)) targetCast.add(norm(p.name));
  }

  if (ex.status === "fulfilled") {
    const imdb = ex.value.imdb_id;
    if (imdb) imdbUrl = `https://www.imdb.com/title/${encodeURIComponent(imdb)}/`;
  }


  await loadTrailer(details.id);
  await loadSimilar(details.id);
}

function renderTarget(m){
  targetEl.classList.remove("hidden");
  trailerEl.classList.add("hidden");
  trailerEl.innerHTML = "";

  const y = (m.release_date || "").slice(0,4) || "????";
    const r = Number(m.vote_average || 0).toFixed(1);
  meta.textContent = `${m.title} (${y}) • ★ ${Number(m.vote_average || 0).toFixed(1)} • ${m.runtime || "?"}m`;

  const genres = (m.genres || []).map(g => g.name);

  targetEl.innerHTML = `
    <div class="poster">
      ${m.poster_path ? `<img src="${IMG(m.poster_path, "w342")}" alt="${escapeHtml(m.title)} poster">` : ""}
    </div>
    <div>
      <div style="font-size:16px; letter-spacing:.04em;">
        <strong>${escapeHtml(m.title)}</strong> <span class="muted">(${y})</span>
      </div>
      <div class="muted tiny" style="margin-top:6px;">
        ${escapeHtml(genres.join(" • "))} ${genres.length ? "•" : ""} ★ ${Number(m.vote_average || 0).toFixed(1)} • ${m.runtime || "?"}m
      </div>
      <div class="badges">
        <span class="badge">2000+ only</span>
        <span class="badge">TMDb</span>
        <span class="badge">IMDb link</span>
        ${m.status ? `<span class="badge">${escapeHtml(m.status)}</span>` : ""}
      </div>
      <p class="muted tiny" style="margin-top:10px; line-height:1.5;">
        ${escapeHtml(m.overview || "No overview available.")}
      </p>
    </div>
  `;
}

async function loadTrailer(id){
  try{
    const vids = await api(`/api/movie/${id}/videos`);
    const t = vids.trailer;
    if (!t) return;

    trailerEl.classList.remove("hidden");
    trailerEl.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${encodeURIComponent(t.key)}"
        title="Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  } catch {
    // optional
  }
}

function scoreCandidate(candidate){
  const candGenres = new Set((candidate.genre_ids || []).map(Number));
  let genreHits = 0;
  for (const gid of candGenres) {
    if ((currentTarget.genres || []).some(g => Number(g.id) === gid)) genreHits++;
  }

  const year = Number((candidate.release_date || "").slice(0,4) || 0);
  const ty = Number((currentTarget.release_date || "").slice(0,4) || 0);
  const yearDiff = Math.abs(ty - year);
  const yearBonus = clamp((12 - yearDiff) / 12, 0, 1);

  const ratingBonus = clamp((Number(candidate.vote_average || 0) / 10), 0, 1);

  return (genreHits * 1.8) + (yearBonus * 0.8) + (ratingBonus * 0.6);
}

async function enrichWhy(candidates){
  const top = candidates.slice(0, 8);

  const enriched = await Promise.all(top.map(async (m) => {
    const [kw, cr] = await Promise.allSettled([
      api(`/api/movie/${m.id}/keywords`),
      api(`/api/movie/${m.id}/credits`)
    ]);

    let sharedKeywords = [];
    if (kw.status === "fulfilled") {
      const cand = new Set((kw.value.keywords || []).map(k => norm(k.name)));
      sharedKeywords = [...cand].filter(x => targetKeywords.has(x)).slice(0, 3);
    }

    let sharedCast = [];
    if (cr.status === "fulfilled") {
      const cand = new Set((cr.value.cast || []).slice(0, 12).map(p => norm(p.name)));
      sharedCast = [...cand].filter(x => targetCast.has(x)).slice(0, 2);
    }

    return { ...m, _why: { sharedKeywords, sharedCast } };
  }));

  const map = new Map(enriched.map(x => [x.id, x]));
  return candidates.map(m => map.get(m.id) || m);
}

async function loadSimilar(id){
  resultsEl.innerHTML = `<div class="muted">Loading…</div>`;

  const data = await api(`/api/movie/${id}/similar?page=1`);
  let list = (data.results || []).filter(passesFilters);

  list = list
    .map(m => ({ ...m, _score: scoreCandidate(m) }))
    .sort((a,b) => (b._score || 0) - (a._score || 0))
    .slice(0, 24);

  list = await enrichWhy(list);

  if (!list.length){
    resultsEl.innerHTML = `<div class="muted">No similar results match your filters.</div>`;
    return;
  }

  const targetGenreIds = new Set((currentTarget.genres || []).map(g => Number(g.id)));

  resultsEl.innerHTML = list.map(m => {
    const y = (m.release_date || "").slice(0,4) || "????";
    const r = Number(m.vote_average || 0).toFixed(1);
    const r = Number(m.vote_average || 0).toFixed(1);
    const why = m._why || {};
    const whyBadges = [];

    const overlapGenres = (m.genre_ids || [])
      .filter(gid => targetGenreIds.has(Number(gid)))
      .map(gid => genreMap.get(Number(gid)) || "Genre")
      .slice(0, 2);

    for (const g of overlapGenres) whyBadges.push(`<span class="badge">genre: ${escapeHtml(g)}</span>`);
    if (why.sharedKeywords?.length) whyBadges.push(`<span class="badge">kw: ${escapeHtml(why.sharedKeywords.join(", "))}</span>`);
    if (why.sharedCast?.length) whyBadges.push(`<span class="badge">cast: ${escapeHtml(why.sharedCast.join(", "))}</span>`);

    const scoreLabel = m._score ? `${(m._score).toFixed(2)}` : "—";

    return `
      <article class="card" data-id="${m.id}">
        <div>
          <div class="cardTitle">${escapeHtml(m.title)}</div>
          <div class="cardSub">${y} • ★ ${r} • score ${escapeHtml(scoreLabel)}</div>
        </div>

        <p class="cardOverview">${escapeHtml((m.overview || "").slice(0, 120))}${(m.overview || "").length > 120 ? "…" : ""}</p>

        <div class="cardPoster">
          ${m.poster_path
            ? `<img src="${IMG(m.poster_path, "w342")}" alt="">`
            : `<div class="muted tiny" style="padding:12px;">No poster</div>`}
        </div>

        <div class="why">
          ${whyBadges.length ? whyBadges.join("") : `<span class="badge">closest by genres/year/rating</span>`}
        </div>
      </article>
    `;
  }).join("");

  resultsEl.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", async () => {
      const mid = card.getAttribute("data-id");
      await pickTarget(mid, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderWatchlist(){
  const list = getWatchlist();
  if (!list.length){
    watchlistEl.innerHTML = `<div class="muted">Nothing saved yet. Open a movie and hit “Add to Watchlist”.</div>`;
    return;
  }

  watchlistEl.innerHTML = list.map(item => {
    const y = (item.release_date || "").slice(0,4) || "????";
    const r = item.vote_average ? Number(item.vote_average).toFixed(1) : "—";
    return `
      <article class="card" data-id="${item.id}">
        <div>
          <div class="cardTitle">${escapeHtml(item.title)}</div>
          <div class="cardSub">${y} • ★ ${r}</div>
        </div>
        <p class="cardOverview">${escapeHtml((m.overview || "").slice(0, 120))}${(m.overview || "").length > 120 ? "…" : ""}</p>

        <div class="cardPoster">
          ${item.poster_path
            ? `<img src="${IMG(item.poster_path, "w342")}" alt="">`
            : `<div class="muted tiny" style="padding:12px;">No poster</div>`}
        </div>
        <div class="targetActions">
          <button class="btn" data-open="${item.id}">Open</button>
          <button class="btn" data-remove="${item.id}">Remove</button>
        </div>
      </article>
    `;
  }).join("");

  watchlistEl.querySelectorAll("button[data-open]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-open");
      modal.classList.add("hidden");
      await pickTarget(id, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  watchlistEl.querySelectorAll("button[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove");
      const next = getWatchlist().filter(x => String(x.id) !== String(id));
      setWatchlist(next);
      renderWatchlist();
    });
  });
}

// Deep link support: /?m=12345
(async function boot(){
  minRatingVal.textContent = minRating.value;

  const url = new URL(window.location.href);
  const mid = url.searchParams.get("m");

  if (mid){
    try{
      await pickTarget(mid, false);
      q.value = currentTarget?.title || "";
      return;
    } catch {
      // ignore
    }
  }

  resultsEl.innerHTML = `<div class="muted">Pick a movie above to generate similar results.</div>`;
})();
