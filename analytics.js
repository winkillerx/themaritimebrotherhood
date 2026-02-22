// analytics.js  (GitHub ONLY)
(function () {
  fetch("https://analytics.filmmatrix.net/track/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page: window.location.pathname,
      title: document.title,
      referrer: document.referrer || null
    })
  }).catch(() => {});
})();
