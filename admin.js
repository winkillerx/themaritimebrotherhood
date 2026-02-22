// admin.js — Film Matrix Admin (FIXED)

const LOGS_ENDPOINT = "https://fm-analytics.vercel.app/api/logs";
const rows = document.getElementById("rows");
const statusEl = document.getElementById("status");

/* -------------------------------
   User-Agent parsing
-------------------------------- */
function parseUA(ua = "") {
  const s = ua.toLowerCase();

  const device =
    s.includes("iphone") || s.includes("android") ? "Mobile" :
    s.includes("ipad") ? "Tablet" :
    "Desktop";

  let browser = "Unknown";
  if (s.includes("edg")) browser = "Edge";
  else if (s.includes("chrome") && !s.includes("edg")) browser = "Chrome";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";

  return { device, browser };
}

/* -------------------------------
   Load logs from analytics API
-------------------------------- */
async function loadLogs() {
  try {
    const res = await fetch(LOGS_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const logs = Array.isArray(data.logs) ? data.logs : [];

    statusEl.textContent = `Connected • ${logs.length} logs`;

    if (!logs.length) {
      rows.innerHTML = `
        <tr>
          <td colspan="6" class="empty">No logs yet</td>
        </tr>
      `;
      return;
    }

    rows.innerHTML = logs.map(log => {
      const { device, browser } = parseUA(log.ua || "");

      return `
        <tr>
          <td class="mono">${new Date(log.time).toLocaleTimeString()}</td>
          <td class="event">${log.event || "-"}</td>
          <td>${log.page || "-"}</td>
          <td>${device}</td>
          <td>${browser}</td>
          <td class="mono">${log.ip || "-"}</td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Admin log load failed:", err);
    statusEl.textContent = "Disconnected";

    rows.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Failed to load logs</td>
      </tr>
    `;
  }
}

/* -------------------------------
   Init + polling
-------------------------------- */
loadLogs();
setInterval(loadLogs, 3000);
