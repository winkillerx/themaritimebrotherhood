const LOGS_ENDPOINT = "https://fm-analytics.vercel.app/api/logs";
const rows = document.getElementById("rows");
const statusEl = document.getElementById("status");

function parseUA(ua = "") {
  ua = ua.toLowerCase();

  const device =
    ua.includes("iphone") || ua.includes("android") ? "Mobile" :
    ua.includes("ipad") ? "Tablet" :
    "Desktop";

  let browser = "Unknown";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";

  return { device, browser };
}

async function loadLogs() {
  try {
    const res = await fetch(LOGS_ENDPOINT);
    const logs = await res.json();

    statusEl.textContent = `Connected • ${logs.length} logs`;

    if (!Array.isArray(logs) || logs.length === 0) {
      rows.innerHTML = `
        <tr>
          <td colspan="6" class="empty">No logs yet</td>
        </tr>
      `;
      return;
    }

    rows.innerHTML = logs.map(log => {
      const { device, browser } = parseUA(log.ua);

      return `
        <tr>
          <td class="mono">${new Date(log.time).toLocaleTimeString()}</td>
          <td class="event">${log.event}</td>
          <td>${log.page || "-"}</td>
          <td>${device}</td>
          <td>${browser}</td>
          <td class="mono">${log.ip}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    statusEl.textContent = "Disconnected";
    rows.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Failed to load logs</td>
      </tr>
    `;
  }
}

// Initial + live refresh
loadLogs();
setInterval(loadLogs, 3000);
