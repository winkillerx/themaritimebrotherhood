/* ============================================================
   FilmMatrix Analytics (SAFE, ISOLATED)
   ============================================================ */
(function () {
  const TRACK_URL = "https://analytics.filmmatrix.net/track/index.php";

  function getSessionId() {
    try {
      let id = localStorage.getItem("fm_session_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("fm_session_id", id);
      }
      return id;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function screenRes() {
    try {
      return `${window.screen.width}x${window.screen.height}`;
    } catch {
      return null;
    }
  }

  window.trackEvent = function (event_type, payload = {}) {
    try {
      fetch(TRACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: String(event_type || "event"),
          page: location.pathname,
          referrer: document.referrer || "direct",
          session_id: getSessionId(),
          screen_resolution: screenRes(),
          ...payload
        }),
        keepalive: true
      });
    } catch {}
  };

  window.addEventListener("load", () => {
    window.trackEvent("page_view");
  }, { once: true });
})();
