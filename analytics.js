// analytics.v2.js
(() => {
  try {
    fetch("https://analytics.filmmatrix.net/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: location.pathname,
        referrer: document.referrer || null
      })
    });
  } catch (e) {}
})();
