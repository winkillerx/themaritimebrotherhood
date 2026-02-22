const OUT = document.getElementById("out");

async function loadLogs() {
  const res = await fetch("https://fm-analytics.vercel.app/api/logs");
  const logs = await res.json();

  if (!logs.length) {
    OUT.textContent = "No logs yet.";
    return;
  }

  OUT.textContent = logs.map(l =>
    `[${l.time}]
IP: ${l.ip}
Event: ${l.event}
Page: ${l.page}
UA: ${l.ua}
----------------------`
  ).join("\n");
}

loadLogs();
setInterval(loadLogs, 3000);
