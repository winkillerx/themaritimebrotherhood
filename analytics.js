// analytics.js
(async () => {
  try {
    await fetch("https://analytics.filmmatrix.net/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page: window.location.pathname
      })
    });
  } catch (e) {
    console.error("Analytics failed", e);
  }
})();
