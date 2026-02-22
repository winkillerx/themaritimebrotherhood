// admin.js (on filmmatrix.net)

const rows = document.getElementById("rows");

async function loadLogs() {
  try {
    const res = await fetch(
      "https://fm-analytics.vercel.app/api/logs"
    );

    const logs = await res.json();

    rows.innerHTML = logs
      .slice()
      .reverse()
      .map(l => `
        <tr>
          <td>${new Date(l.time).toLocaleTimeString()}</td>
          <td>${l.event}</td>
          <td>${l.page}</td>
          <td>${l.title || "-"}</td>
          <td>${l.type || "-"}</td>
          <td>${l.device}</td>
          <td style="opacity:.6">${l.ip}</td>
        </tr>
      `)
      .join("");
  } catch (e) {
    rows.innerHTML = `
      <tr>
        <td colspan="7">Failed to load logs</td>
      </tr>
    `;
  }
}

loadLogs();
setInterval(loadLogs, 3000);
