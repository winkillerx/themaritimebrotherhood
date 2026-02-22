// 🔐 simple password gate
if (prompt("Admin password") !== "test123") {
  document.body.innerHTML = "Access denied";
  throw new Error("Denied");
}

async function loadLogs() {
  const res = await fetch("https://fm-analytics.vercel.app/api/logs");
  const logs = await res.json();

  const el = document.getElementById("logs");
  el.innerHTML = logs.map(l => `
    <div class="log">
      <div class="event">${l.event}</div>
      <div class="meta">
        ${l.time} · ${l.page}
        ${l.title ? "· " + l.title : ""}
        ${l.query ? "· q=" + l.query : ""}
        <br>
        IP: ${l.ip}
      </div>
    </div>
  `).join("");
}

loadLogs();
setInterval(loadLogs, 4000);
