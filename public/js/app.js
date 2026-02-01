const screenStart = document.getElementById("screenStart");
const screenGame  = document.getElementById("screenGame");
const startTap    = document.getElementById("startTap");

const ghostBtn = document.getElementById("ghostBtn");
const drawer   = document.getElementById("drawer");

const menuBtn   = document.getElementById("menuBtn");
const popup     = document.getElementById("popup");
const resumeBtn = document.getElementById("resumeBtn");
const quitBtn   = document.getElementById("quitBtn");

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

startTap.addEventListener("click", () => {
  goGame();
});

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
});

document.addEventListener("click", () => {
  hide(drawer);
  hide(popup);
});

const cobakeList = document.getElementById("cobakeList");
const stage = document.querySelector(".stage");

function buildCobakeList(){
  const list = window.COBAKE_DATA || [];
  cobakeList.innerHTML = "";

  list.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "cobake-item";
    btn.type = "button";
    btn.dataset.id = c.id;

    btn.innerHTML = `
      <img
        class="thumb-img"
        src="./assets/img/cobake/monokuro/${c.id}.png"
        alt="${c.name}"
        draggable="false"
      />
    `;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      spawnPiece(c.id);
    });

    cobakeList.appendChild(btn);
  });
}

function spawnPiece(id){
  // 既存のピースは一旦消す（最初は1体だけでOK）
  const old = stage.querySelector(".piece");
  if (old) old.remove();

  const img = document.createElement("img");
  img.className = "piece";
  img.src = `./assets/img/cobake/monokuro/${id}.png`;
  img.alt = id;
  img.draggable = false;

  stage.appendChild(img);
}

buildCobakeList();

// =========================
// Drag move for .piece (Pointer Events)
// =========================
(function enablePieceDrag(){
  const stage = document.querySelector(".stage");
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

    // 初回：left/top が未設定なら、現在位置から作る
    const rectStage = stage.getBoundingClientRect();
    const rectEl = draggingEl.getBoundingClientRect();

    // stage内の現在の左上（local）
    const currentLeft = rectEl.left - rectStage.left;
    const currentTop  = rectEl.top  - rectStage.top;

    // left/top を確定して transform を無効化（以後は left/top で動かす）
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

    // ステージ内に収める（はみ出し防止）
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
