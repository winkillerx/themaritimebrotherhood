// analytics.js — FINAL, SIMPLE, GUARANTEED TO FIRE
(() => {
  try {
    console.log("Analytics loaded");

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
    .then(res => res.text())
    .then(txt => console.log("Analytics response:", txt))
    .catch(err => console.error("Analytics fetch error:", err));

  } catch (e) {
    console.error("Analytics fatal error:", e);
  }
})();
