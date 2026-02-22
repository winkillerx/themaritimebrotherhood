(function () {
  try {
    fetch("https://analytics.filmmatrix.net/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page: window.location.pathname,
        title: document.title,
        referrer: document.referrer || null,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || null
      })
    });
  } catch (e) {
    // analytics should NEVER break the site
  }
})();
