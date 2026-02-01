// =========================
// Screens
// =========================
const screenStart = document.getElementById("screenStart");
const screenGame  = document.getElementById("screenGame");

const startBtn    = document.getElementById("startBtn");
const startPopArea = document.getElementById("startPopArea");

// game ui
const ghostBtn = document.getElementById("ghostBtn");
const drawer   = document.getElementById("drawer");
const menuBtn  = document.getElementById("menuBtn");
const popup    = document.getElementById("popup");
const resumeBtn = document.getElementById("resumeBtn");
const quitBtn   = document.getElementById("quitBtn");

const cobakeList = document.getElementById("cobakeList");
const stage = document.getElementById("stage");

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
// Start animation (B)
// 1) title only bg (start_ui.png)
// 2) pop cobakes from bottom (random order/pos)
// 3) show START button
// =========================
function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSequence(){
  const list = window.COBAKE_DATA || [];
  startPopArea.innerHTML = "";
  hide(startBtn);

  // random order
  const order = shuffle(list);

  // pop timing
  const baseDelay = 120;     // ms
  const stepDelay = 120;     // ms

  // x positions range (percent)
  const xMin = 10;
  const xMax = 88;

  order.forEach((c, idx) => {
    const img = document.createElement("img");
    img.className = "start-pop";
    img.src =`./assets/img/cobake/monokuro/color/${c.id}.png`;
    img.alt = "";
    img.draggable = false;

    const x = xMin + Math.random() * (xMax - xMin);
    img.style.left = `${x}%`;
    img.style.animationDelay = `${baseDelay + stepDelay * idx}ms`;

    startPopArea.appendChild(img);
  });

  // show start button after last pop
  const total = baseDelay + stepDelay * order.length + 650;
  window.setTimeout(() => {
    show(startBtn);
  }, total);
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

function spawnPiece(id){
  const old = stage.querySelector(".piece");
  if (old) old.remove();

  const img = document.createElement("img");
  img.className = "piece";
  img.src = `./assets/img/cobake/monokuro/monokuro/${id}.png`;
  img.alt = id;
  img.draggable = false;

  stage.appendChild(img);
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

resumeBtn.addEventListener("click", () => {
  hide(popup);
});

quitBtn.addEventListener("click", () => {
  goStart();
  startSequence(); // 戻ったらまた演出から
});

document.addEventListener("click", () => {
  hide(drawer);
  hide(popup);
});

// =========================
// Drag move for .piece (Pointer Events)
// =========================
(function enablePieceDrag(){
  if (!stage) return;

  let draggingEl = null;
  let startX = 0;
  let startY = 0;
  let elStartLeft = 0;
  let elStartTop = 0;

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function getLocalPoint(e){
    const r = stage.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      w: r.width,
      h: r.height
    };
  }

  stage.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("piece")) return;

    e.preventDefault();
    e.stopPropagation();

    draggingEl = t;
    draggingEl.classList.add("is-dragging");
    draggingEl.setPointerCapture(e.pointerId);

    const rectStage = stage.getBoundingClientRect();
    const rectEl = draggingEl.getBoundingClientRect();

    const currentLeft = rectEl.left - rectStage.left;
    const currentTop  = rectEl.top  - rectStage.top;

    draggingEl.style.transform = "none";
    draggingEl.style.left = `${currentLeft}px`;
    draggingEl.style.top  = `${currentTop}px`;

    elStartLeft = currentLeft;
    elStartTop  = currentTop;
    startX = e.clientX;
    startY = e.clientY;
  });

  stage.addEventListener("pointermove", (e) => {
    if (!draggingEl) return;
    e.preventDefault();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const local = getLocalPoint(e);
    const elW = draggingEl.offsetWidth;
    const elH = draggingEl.offsetHeight;

    const nextLeft = clamp(elStartLeft + dx, 0, local.w - elW);
    const nextTop  = clamp(elStartTop  + dy, 0, local.h - elH);

    draggingEl.style.left = `${nextLeft}px`;
    draggingEl.style.top  = `${nextTop}px`;
  });

  function endDrag(){
    if (!draggingEl) return;
    draggingEl.classList.remove("is-dragging");
    draggingEl = null;
  }

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
})();

// =========================
// Boot
// =========================
buildCobakeList();
startSequence();
