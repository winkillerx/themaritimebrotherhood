// analytics.v2.js — FilmMatrix Analytics (FINAL)
(() => {
  try {
    fetch("https://analytics.filmmatrix.net/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || null
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status !== "ok") {
        console.warn("Analytics error:", data);
      }
    })
    .catch(err => {
      console.warn("Analytics fetch failed:", err);
    });
  } catch (e) {
    console.warn("Analytics fatal error:", e);
  }
})();
