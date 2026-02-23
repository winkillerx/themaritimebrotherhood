<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<title>Working on updates</title>

<style>
html, body {
  margin:0;
  padding:0;
  height:100%;
  background:#0a0f1f;
  color:#fff;
  font-family:"Segoe UI", system-ui, sans-serif;
  overflow:hidden;
  touch-action:none;
  user-select:none;
}

.screen {
  position:fixed;
  inset:0;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
}

.spinner {
  width:80px;
  height:80px;
  border:6px solid rgba(255,255,255,.15);
  border-top-color:#fff;
  border-radius:50%;
  animation:spin 1.2s linear infinite;
  margin-bottom:28px;
}

@keyframes spin { to { transform:rotate(360deg); } }

.dim {
  animation:dim 120s forwards;
}

@keyframes dim {
  to { filter:brightness(.55); }
}

h1 { font-size:22px; margin-bottom:8px; }
p { font-size:15px; opacity:.85; margin:4px 0; }
#percent { margin-top:12px; font-size:14px; opacity:.75; }
#msg { margin-top:8px; font-size:13px; opacity:.6; }

/* BOOT */
#boot { background:black; }
#boot p { opacity:.7; }

/* BSOD */
#bsod {
  display:none;
  background:#0078d7;
  color:white;
  padding:40px;
  align-items:flex-start;
  text-align:left;
}
#bsod h1 { font-size:56px; }
</style>
</head>

<body>

<!-- BOOT -->
<div id="boot" class="screen">
  <div class="spinner"></div>
  <p>Starting Windows</p>
</div>

<!-- UPDATE -->
<div id="update" class="screen dim" style="display:none;">
  <div class="spinner"></div>
  <h1 id="title">Working on updates</h1>
  <p id="subtitle">Don’t turn off your device.</p>
  <div id="percent">0%</div>
  <div id="msg"></div>
</div>

<!-- BSOD -->
<div id="bsod" class="screen">
  <h1>:(</h1>
  <p>Your device ran into a problem and needs to restart.</p>
  <p>We're just collecting some error info.</p>
  <br>
  <p>Stop code: SYSTEM_UPDATE_FAILURE</p>
</div>

<script>
/* ===============================
   BOOT → UPDATE
================================ */
setTimeout(() => {
  boot.style.display = "none";
  update.style.display = "flex";
}, 4000);

/* ===============================
   UPDATE LOGIC (MEAN)
================================ */
let percent = 0;
let restarting = false;

const stallPoints = [87, 91, 93];
const messages = [
  "This may take a while.",
  "Installing system components.",
  "Applying security updates.",
  "Optimizing system performance.",
  "Almost there.",
  "Please keep your device plugged in."
];

setInterval(() => {
  if (restarting) return;
  if (Math.random() < 0.15) return;

  if (percent < 99) {
    if (stallPoints.includes(percent) && Math.random() < 0.85) return;
    percent++;
    percentEl.textContent = percent + "%";
    msgEl.textContent = messages[Math.floor(Math.random() * messages.length)];
  }

  if (percent >= 99 && Math.random() < 0.35) fakeRestart();
}, 1400);

function fakeRestart() {
  restarting = true;
  title.textContent = "Restarting";
  subtitle.textContent = "";
  percentEl.textContent = "";
  msgEl.textContent = "";

  setTimeout(() => {
    restarting = false;
    percent = Math.floor(85 + Math.random() * 6);
    title.textContent = "Working on updates";
    subtitle.textContent = "Don’t turn off your device.";
  }, 6000);
}

/* ===============================
   BSOD AFTER 10 MINUTES
================================ */
setTimeout(() => {
  update.style.display = "none";
  bsod.style.display = "flex";
  setTimeout(() => location.reload(), 6000);
}, 600000);

/* ===============================
   HARD LOCK INPUT
================================ */
document.addEventListener("touchmove", e => e.preventDefault(), { passive:false });
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());
window.addEventListener("focus", () => document.body.style.pointerEvents = "none");

/* ===============================
   SECRET UNLOCK: 5 FINGERS
================================ */
let unlockTimer = null;

document.addEventListener("touchstart", e => {
  if (e.touches.length === 5) {
    unlockTimer = setTimeout(() => {
      alert("Update completed 😈");
      location.reload();
    }, 6000);
  } else resetUnlock();
});

document.addEventListener("touchend", resetUnlock);
document.addEventListener("touchcancel", resetUnlock);

function resetUnlock() {
  clearTimeout(unlockTimer);
  unlockTimer = null;
}

/* ===============================
   ANDROID VOLUME UNLOCK
================================ */
let volCount = 0;
let volTimer = null;

window.addEventListener("keydown", e => {
  if (!/Android/i.test(navigator.userAgent)) return;
  if (e.key === "AudioVolumeDown") {
    volCount++;
    clearTimeout(volTimer);
    volTimer = setTimeout(() => volCount = 0, 2000);
    if (volCount >= 5) {
      alert("Update completed 😈");
      location.reload();
    }
  }
});
</script>

</body>
</html>
