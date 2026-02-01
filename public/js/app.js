// =========================
// Screens
// =========================
const screenStart = document.getElementById("screenStart");
const screenGame  = document.getElementById("screenGame");

const startBtn     = document.getElementById("startBtn");
const startPopArea = document.getElementById("startPopArea");
const startLayer   = document.getElementById("startLayer");

// game ui
const ghostBtn  = document.getElementById("ghostBtn");
const drawer    = document.getElementById("drawer");
const menuBtn   = document.getElementById("menuBtn");
const popup     = document.getElementById("popup");
const resumeBtn = document.getElementById("resumeBtn");
const quitBtn   = document.getElementById("quitBtn");

const cobakeList = document.getElementById("cobakeList");
const stage      = document.getElementById("stage");

function show(el){ el.hidden = false; }
function hide(el){ el.hidden = true; }

function goGame(){
  screenStart.classList.remove("is-active");
  screenGame.classList.add("is-active");
}

function goStart(){
  hide(drawer);
  hide(popup);
  screenGame.classList.remove("is-active");
  screenStart.classList.add("is-active");
}

// =========================
// Helpers
// =========================
function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function getCobakeScale(id){
  const list = window.COBAKE_DATA || [];
  const hit = list.find(x => x.id === id);
  const s = hit && typeof hit.scale === "number" ? hit.scale : 1;
  return s > 0 ? s : 1;
}

// =========================
// Start animation
// - must stay inside screen
// - use scale from COBAKE_DATA
// =========================
function startSequence(){
  const list = window.COBAKE_DATA || [];
  startPopArea.innerHTML = "";
  hide(startBtn);

  const order = shuffle(list);

  const baseDelay = 120; // ms
  const stepDelay = 120; // ms

  // stage size
  const r = (startLayer ? startLayer.getBoundingClientRect() : null);
  const W = r ? r.width : 1024;

  // base width (pipple=1.0) + hard cap so big chars never overflow
  const baseW = 220;
  const maxW  = W * 0.42;

  // y positions (keep inside)
  const bottomMin = 6;   // %
  const bottomMax = 14;  // %

  order.forEach((c, idx) => {
    const img = document.createElement("img");
    img.className = "start-pop";
    img.src = `./assets/img/cobake/monokuro/color/${c.id}.png`;
    img.alt = "";
    img.draggable = false;

    const s = (c && typeof c.scale === "number" && c.scale > 0) ? c.scale : 1;

    // width clamp
    const w0 = baseW * s;
    const w  = Math.min(w0, maxW);
    img.style.width = `${w}px`;
    img.style.height = "auto";

    // x random but clamped by actual width
    const xPxMin = 16;
    const xPxMax = Math.max(xPxMin, W - w - 16);
    const xPx = clamp(xPxMin + Math.random() * (xPxMax - xPxMin), xPxMin, xPxMax);
    img.style.left = `${xPx}px`;

    // y random
    const b = bottomMin + Math.random() * (bottomMax - bottomMin);
    img.style.bottom = `${b}%`;

    // timing
    img.style.animationDelay = `${baseDelay + stepDelay * idx}ms`;

    startPopArea.appendChild(img);
  });

  const total = baseDelay + stepDelay * order.length + 650;
  window.setTimeout(() => show(startBtn), total);
}

startBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  goGame();
});

// =========================
// Drawer list (monokuro)
// =========================
function buildCobakeList(){
  const list = window.COBAKE_DATA || [];
  cobakeList.innerHTML = "";

  list.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "cobake-item";
    btn.type = "button";
    btn.dataset.id = c.id;

    btn.innerHTML = `
      <img class="thumb-img"
           src="./assets/img/cobake/monokuro/monokuro/${c.id}.png"
           alt="${c.name}"
           draggable="false" />
    `;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      spawnPiece(c.id);
    });

    cobakeList.appendChild(btn);
  });
}

// =========================
// Puzzle (pinch/rotate + silhouette + snap + success)
// =========================
(function injectEffectsCss(){
  const css = `
    .bk-silhouette{
      position:absolute;
      left:0; top:0;
      transform-origin:center center;
      pointer-events:none;
      user-select:none;
      -webkit-user-drag:none;
      opacity:.22;
      filter: brightness(0) saturate(0) blur(.2px);
    }
    .bk-silhouette.is-hint{
      opacity:.36;
      filter: brightness(0) saturate(0) blur(.1px) drop-shadow(0 0 10px rgba(255,255,255,.85));
    }

    .piece{
      transform-origin:center center;
      will-change: transform;
    }
    .piece.is-hint{
      filter: drop-shadow(0 0 10px rgba(255,255,255,.95));
    }

    .success-flash{
      position:absolute;
      left:0; top:0; right:0; bottom:0;
      pointer-events:none;
      border-radius:24px;
      overflow:hidden;
      z-index: 5;
    }
    .success-flash::before{
      content:"";
      position:absolute;
      left:50%;
      top:50%;
      width:12px;
      height:12px;
      border-radius:999px;
      transform: translate(-50%,-50%) scale(1);
      background: radial-gradient(circle, rgba(255,255,255,.95), rgba(255,255,255,0) 70%);
      opacity:0;
    }
    .success-flash.is-on::before{
      animation: kiran 520ms ease-out forwards;
    }
    @keyframes kiran{
      0%   { opacity:0; transform: translate(-50%,-50%) scale(.6); }
      35%  { opacity:1; transform: translate(-50%,-50%) scale(18); }
      100% { opacity:0; transform: translate(-50%,-50%) scale(28); }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  if (stage && !stage.querySelector(".success-flash")){
    const flash = document.createElement("div");
    flash.className = "success-flash";
    stage.appendChild(flash);
  }
})();

const puzzle = {
  id: null,
  pieceEl: null,
  silhouetteEl: null,
  flashEl: null,
  solved: false,

  // pose
  x: 0, y: 0, rot: 0, scale: 1,

  // base display width (pipple=1.0)
  baseW: 120,

  // target pose
  target: { x: 0, y: 0, rot: 0, scale: 1 },

  // pointer tracking
  pointers: new Map(),
  gesture: null
};

function stageRect(){ return stage.getBoundingClientRect(); }

function ensureFlashEl(){
  if (!stage) return null;
  puzzle.flashEl = stage.querySelector(".success-flash");
  return puzzle.flashEl;
}

function rand(min, max){ return min + Math.random() * (max - min); }

function normalizeAngleRad(a){
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function applyPose(){
  if (!puzzle.pieceEl) return;
  puzzle.pieceEl.style.transform =
    `translate(${puzzle.x}px, ${puzzle.y}px) rotate(${puzzle.rot}rad) scale(${puzzle.scale})`;
}

function applyTargetPose(){
  if (!puzzle.silhouetteEl) return;
  const t = puzzle.target;
  puzzle.silhouetteEl.style.transform =
    `translate(${t.x}px, ${t.y}px) rotate(${t.rot}rad) scale(${t.scale})`;
}

function clearHint(){
  if (puzzle.pieceEl) puzzle.pieceEl.classList.remove("is-hint");
  if (puzzle.silhouetteEl) puzzle.silhouetteEl.classList.remove("is-hint");
}

function setHint(on){
  if (!puzzle.pieceEl || !puzzle.silhouetteEl) return;
  puzzle.pieceEl.classList.toggle("is-hint", !!on);
  puzzle.silhouetteEl.classList.toggle("is-hint", !!on);
}

function distance(a, b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function doVibrate(){
  try{
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  }catch(_){}
}

function doKiran(){
  const el = ensureFlashEl();
  if (!el) return;
  el.classList.remove("is-on");
  void el.offsetWidth;
  el.classList.add("is-on");
  window.setTimeout(() => el.classList.remove("is-on"), 700);
}

function playKacha(){
  try{
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "square";
    o.frequency.value = 420;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    const t0 = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    o.frequency.setValueAtTime(420, t0);
    o.frequency.linearRampToValueAtTime(220, t0 + 0.06);
    o.stop(t0 + 0.09);
    o.onended = () => ac.close();
  }catch(_){}
}

function swapToColor(){
  if (!puzzle.pieceEl || !puzzle.id) return;
  const colorSrc = `./assets/img/cobake/monokuro/color/${puzzle.id}.png`;
  const img = new Image();
  img.onload = () => { if (puzzle.pieceEl) puzzle.pieceEl.src = colorSrc; };
  img.src = colorSrc;
}

function checkSnap(){
  if (!puzzle.pieceEl || !puzzle.silhouetteEl) return;
  if (puzzle.solved) return;

  const t = puzzle.target;
  const p = { x: puzzle.x, y: puzzle.y };

  const posOK   = distance(p, t) <= 18;
  const rotOK   = Math.abs(normalizeAngleRad(puzzle.rot - t.rot)) <= (10 * Math.PI / 180);
  const scaleOK = Math.abs(puzzle.scale - t.scale) <= 0.08;

  const near = posOK && rotOK && scaleOK;
  setHint(near);

  if (!near) return;

  puzzle.x = t.x;
  puzzle.y = t.y;
  puzzle.rot = t.rot;
  puzzle.scale = t.scale;
  applyPose();

  puzzle.solved = true;
  clearHint();

  doKiran();
  playKacha();
  doVibrate();
  swapToColor();

  window.setTimeout(() => {
    if (puzzle.silhouetteEl) puzzle.silhouetteEl.style.opacity = "0";
  }, 220);
}

function setRandomTargetPose(){
  const r = stageRect();
  const margin = 40;

  const rot = rand(-18, 18) * Math.PI / 180;
  const x = rand(margin, r.width - margin);
  const y = rand(margin, r.height - margin);

  const s = getCobakeScale(puzzle.id);

  puzzle.target = { x, y, rot, scale: s };
  applyTargetPose();
}

function spawnPiece(id){
  puzzle.id = id;
  puzzle.solved = false;
  puzzle.pointers.clear();
  puzzle.gesture = null;

  const oldPiece = stage.querySelector(".piece");
  if (oldPiece) oldPiece.remove();
  const oldBk = stage.querySelector(".bk-silhouette");
  if (oldBk) oldBk.remove();

  const s = getCobakeScale(id);

  const bk = document.createElement("img");
  bk.className = "bk-silhouette";
  bk.src = `./assets/img/cobake/monokuro/monokuro/${id}.png`;
  bk.alt = "";
  bk.draggable = false;

  const img = document.createElement("img");
  img.className = "piece";
  img.src = `./assets/img/cobake/monokuro/monokuro/${id}.png`;
  img.alt = id;
  img.draggable = false;

  // ensure correct aspect
  img.style.height = "auto";
  bk.style.height = "auto";

  // base display widths
  const baseW = puzzle.baseW;
  img.style.width = `${baseW * s}px`;
  bk.style.width  = `${baseW * s}px`;

  // insert silhouette under piece
  const bg = stage.querySelector(".stage-bg");
  if (bg && bg.parentNode === stage) stage.insertBefore(bk, bg.nextSibling);
  else stage.appendChild(bk);

  stage.appendChild(img);

  puzzle.pieceEl = img;
  puzzle.silhouetteEl = bk;

  // initial pose
  const r = stageRect();
  puzzle.x = r.width * 0.5;
  puzzle.y = r.height * 0.60;
  puzzle.rot = 0;
  puzzle.scale = s;
  applyPose();

  setRandomTargetPose();
  clearHint();
}

// =========================
// UI open/close
// =========================
ghostBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (drawer.hidden) { show(drawer); hide(popup); }
  else hide(drawer);
});

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (popup.hidden) { show(popup); hide(drawer); }
  else hide(popup);
});

resumeBtn.addEventListener("click", () => hide(popup));

quitBtn.addEventListener("click", () => {
  goStart();
  startSequence();
});

document.addEventListener("click", () => {
  hide(drawer);
  hide(popup);
});

// =========================
// Pointer gestures (drag + pinch + rotate)
// =========================
(function enableGestures(){
  if (!stage) return;

  function ptFromEvent(e){
    const r = stageRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function centerOfTwo(a, b){
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }

  function dist(a, b){
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function ang(a, b){
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  stage.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("piece")) return;
    if (!puzzle.pieceEl) return;
    if (puzzle.solved) return;

    e.preventDefault();
    e.stopPropagation();

    puzzle.pieceEl.setPointerCapture(e.pointerId);

    const p = ptFromEvent(e);
    puzzle.pointers.set(e.pointerId, p);

    if (puzzle.pointers.size === 1){
      puzzle.gesture = {
        mode: "drag",
        start: p,
        startX: puzzle.x,
        startY: puzzle.y
      };
      puzzle.pieceEl.classList.add("is-dragging");
      return;
    }

    if (puzzle.pointers.size === 2){
      const arr = Array.from(puzzle.pointers.values());
      const a = arr[0], b = arr[1];
      const c = centerOfTwo(a, b);
      puzzle.gesture = {
        mode: "two",
        startCenter: c,
        startDist: dist(a, b),
        startAng: ang(a, b),
        startX: puzzle.x,
        startY: puzzle.y,
        startRot: puzzle.rot,
        startScale: puzzle.scale
      };
      puzzle.pieceEl.classList.remove("is-dragging");
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!puzzle.pieceEl) return;
    if (!puzzle.pointers.has(e.pointerId)) return;

    e.preventDefault();

    const p = ptFromEvent(e);
    puzzle.pointers.set(e.pointerId, p);

    if (!puzzle.gesture) return;

    if (puzzle.pointers.size === 1 && puzzle.gesture.mode === "drag"){
      const g = puzzle.gesture;
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      puzzle.x = g.startX + dx;
      puzzle.y = g.startY + dy;
      applyPose();
      checkSnap();
      return;
    }

    if (puzzle.pointers.size === 2 && puzzle.gesture.mode === "two"){
      const g = puzzle.gesture;
      const arr = Array.from(puzzle.pointers.values());
      const a = arr[0], b = arr[1];

      const c = centerOfTwo(a, b);
      const d = dist(a, b);
      const aNow = ang(a, b);

      const centerDx = c.x - g.startCenter.x;
      const centerDy = c.y - g.startCenter.y;

      const scale = g.startScale * (d / (g.startDist || 1));
      const rot   = g.startRot + (aNow - g.startAng);

      puzzle.x = g.startX + centerDx;
      puzzle.y = g.startY + centerDy;
      puzzle.scale = clamp(scale, 0.2, 3.0);
      puzzle.rot = rot;

      applyPose();
      checkSnap();
    }
  });

  function endPointer(e){
    if (!puzzle.pieceEl) return;
    if (!puzzle.pointers.has(e.pointerId)) return;

    puzzle.pointers.delete(e.pointerId);

    if (puzzle.pointers.size === 0){
      puzzle.gesture = null;
      puzzle.pieceEl.classList.remove("is-dragging");
      return;
    }

    if (puzzle.pointers.size === 1){
      const remain = Array.from(puzzle.pointers.values())[0];
      puzzle.gesture = {
        mode: "drag",
        start: remain,
        startX: puzzle.x,
        startY: puzzle.y
      };
      puzzle.pieceEl.classList.add("is-dragging");
    }
  }

  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
})();

// =========================
// Boot
// =========================
buildCobakeList();
startSequence();
