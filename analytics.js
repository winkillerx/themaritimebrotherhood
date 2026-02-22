/* ==========================================================
   FilmMatrix Analytics – Client Tracker
   Sends: event_type, page, session_id, screen_resolution
   ========================================================== */

(function () {
  const ENDPOINT = "https://analytics.filmmatrix.net/dashboard/track.php";

  function getSessionId() {
    try {
      let id = localStorage.getItem("fm_session_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("fm_session_id", id);
      }
      return id;
    } catch {
      return null;
    }
  }

  function screenResolution() {
    try {
      return `${window.screen.width}x${window.screen.height}`;
    } catch {
      return null;
    }
  }

  async function sendEvent(event_type, extra = {}) {
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event_type,
          page: location.pathname,
          session_id: getSessionId(),
          screen_resolution: screenResolution(),
          referrer: document.referrer || null,
          ...extra
        })
      });
    } catch {
      // silent fail (analytics must NEVER break site)
    }
  }

  // expose globally (for search, clicks later)
  window.fmTrack = sendEvent;

  // automatic page view
  window.addEventListener("load", () => {
    sendEvent("page_view");
  }, { once: true });

})();
