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

// dokokana
const dokokanaBtn = document.getElementById("dokokanaBtn");

// regulations popup
const regPopup = document.getElementById("regPopup");
const regMask  = document.getElementById("regMask");
const regClose = document.getElementById("regClose");
const regFrame = document.getElementById("regFrame");

function openRegPopup(url){
  if (!regPopup || !regFrame) return;
  regFrame.src = url || "";
  show(regPopup);
  // 他UIは閉じる
  hide(drawer);
  hide(popup);
}

function closeRegPopup(){
  if (!regPopup || !regFrame) return;
  hide(regPopup);
  regFrame.src = "";
}

// legal icons -> popup
document.querySelectorAll(".legal-icons a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = a.getAttribute("href") || "";
    openRegPopup(url);
  });
});

// close actions
if (regClose){
  regClose.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeRegPopup();
  });
}

if (regMask){
  regMask.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeRegPopup();
  });
}

document.addEventListener("keydown", (e) => {
  if (!regPopup || regPopup.hidden) return;
  if (e.key === "Escape") closeRegPopup();
});

function show(el){
  if (!el) return;
  el.hidden = false;
}
function hide(el){
  if (!el) return;
  el.hidden = true;
}

function buildGameSilhouettes(){
  if (!stage) return;

  // 掃除
  const old = stage.querySelector(".silhouette-layer");
  if (old) old.remove();

  const layer = document.createElement("div");
  layer.className = "silhouette-layer";
  stage.appendChild(layer);

  const rect = stage.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  // 深緑枠内の安全マージン（永久に枠外NG）
  const mLeft   = Math.round(W * 0.08);
  const mRight  = Math.round(W * 0.08);
  const mTop    = Math.round(H * 0.10);
  const mBottom = Math.round(H * 0.10);

  const safeW = W - mLeft - mRight;
  const safeH = H - mTop - mBottom;

  // ===== 被りゼロを保証する：セル占有グリッド =====
  // 4列×5行 = 20セル（10体でも余裕）
  const COLS = 4;
  const ROWS = 5;

  const cellW = safeW / COLS;
  const cellH = safeH / ROWS;

  // 置き方（セルspan）。大→中→小
  // ※どのspanでもセル矩形内に収まるので枠外ゼロ
  const SHAPES = [
    { cw: 2, ch: 2 }, // 大
    { cw: 2, ch: 1 }, // 横長
    { cw: 1, ch: 2 }, // 縦長
    { cw: 1, ch: 1 }  // 小
  ];

  // 10体の構成（密度感：大/中/小）
  // 例：大2・中4・小4（合計10）
  const TARGET = [
    { cw: 2, ch: 2 }, { cw: 2, ch: 2 },
    { cw: 2, ch: 1 }, { cw: 2, ch: 1 },
    { cw: 1, ch: 2 }, { cw: 1, ch: 2 },
    { cw: 1, ch: 1 }, { cw: 1, ch: 1 }, { cw: 1, ch: 1 }, { cw: 1, ch: 1 }
  ];

  // IDs をランダム
  const list = window.COBAKE_DATA || [];
  const ids = list.map(c => c.id);
  for (let i = ids.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const count = Math.min(10, ids.length);

  // occupancy
  const occ = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  function canPlace(r, c, cw, ch){
    if (r + ch > ROWS) return false;
    if (c + cw > COLS) return false;
    for (let rr = r; rr < r + ch; rr++){
      for (let cc = c; cc < c + cw; cc++){
        if (occ[rr][cc]) return false;
      }
    }
    return true;
  }

  function markPlace(r, c, cw, ch){
    for (let rr = r; rr < r + ch; rr++){
      for (let cc = c; cc < c + cw; cc++){
        occ[rr][cc] = true;
      }
    }
  }

  // 0/90/180/270
  const rots = [0, 90, 180, 270];
  const pickRot = () => rots[Math.floor(Math.random() * rots.length)];

  // 置く順番：大から（詰めやすい）
  const want = TARGET.slice(0, count);

  for (let i = 0; i < want.length; i++){
    const id = ids[i];
    const shape = want[i];

    // 候補セルをランダムに探索
    const candidates = [];
    for (let r = 0; r < ROWS; r++){
      for (let c = 0; c < COLS; c++){
        if (canPlace(r, c, shape.cw, shape.ch)) candidates.push({ r, c });
      }
    }

    // 置けない場合は形を小さくする（枠外/被りゼロを維持）
    let finalShape = shape;
    let pick = null;

    function shuffle(arr){
      for (let k = arr.length - 1; k > 0; k--){
        const j = Math.floor(Math.random() * (k + 1));
        [arr[k], arr[j]] = [arr[j], arr[k]];
      }
    }

    shuffle(candidates);

    if (candidates.length > 0){
      pick = candidates[0];
    } else {
      // fallback: 置ける形を探す
      const fallbackShapes = SHAPES.slice().sort((a,b) => (a.cw*a.ch) - (b.cw*b.ch));
      for (const fs of fallbackShapes){
        const cand2 = [];
        for (let r = 0; r < ROWS; r++){
          for (let c = 0; c < COLS; c++){
            if (canPlace(r, c, fs.cw, fs.ch)) cand2.push({ r, c });
          }
        }
        shuffle(cand2);
        if (cand2.length){
          finalShape = fs;
          pick = cand2[0];
          break;
        }
      }
    }

    if (!pick){
      // ここに来る場合は ROWS/COLS を増やす必要があるが、現設定では到達しない想定
      continue;
    }

    markPlace(pick.r, pick.c, finalShape.cw, finalShape.ch);

    // セル矩形（枠内100%保証）
    const x = mLeft + pick.c * cellW;
    const y = mTop + pick.r * cellH;
    const bw = finalShape.cw * cellW;
    const bh = finalShape.ch * cellH;

    const box = document.createElement("div");
    box.className = "silhouette-box";
    box.style.position = "absolute";
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${bw}px`;
    box.style.height = `${bh}px`;
    box.style.pointerEvents = "none";
    box.style.zIndex = "80";
    box.style.overflow = "hidden";

    const img = document.createElement("img");
    img.className = "silhouette";
    img.src = `./assets/img/cobake/monokuro/bk/${id}.png`;
    img.alt = "";
    img.draggable = false;
    img.style.position = "absolute";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";

    const rot = pickRot();

    // 90/270 のときは縦横が入れ替わるため、ボックス内に収まるように縮小する
    // （overflow:hidden による切れを永久に防ぐ）
    let scale = 1;
    if (rot === 90 || rot === 270){
      scale = Math.min(bw / bh, bh / bw); // <= 1 になる
    }

    img.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

    box.appendChild(img);
    layer.appendChild(box);
  }
}

let gameStartArmed = false;

function armGameStartTap(){
  if (!stage) return;
  if (gameStartArmed) return;
  gameStartArmed = true;

  function startGameNow(e){
    // どこタップでも開始
    e.preventDefault();
    e.stopPropagation();

    gameStartArmed = false;

    hide(dokokanaBtn);
    if (ghostBtn) ghostBtn.hidden = false;
    if (menuBtn)  menuBtn.hidden  = false;

    stage.removeEventListener("pointerdown", startGameNow, true);
    stage.removeEventListener("click", startGameNow, true);
  }

  // pointerdown + click の両方（環境差対策）
  stage.addEventListener("pointerdown", startGameNow, true);
  stage.addEventListener("click", startGameNow, true);
}

function goGame(){
  // START → GAME
  screenStart.classList.remove("is-active");
  screenGame.classList.add("is-active");

  // START側UIを初期化
  hide(startBtn);
  startPopArea.innerHTML = "";

  // game ui reset（初期は触れない状態）
  hide(drawer);
  hide(popup);

  // 右上オバケ/右下× は「ゲーム開始タップ後」に出す
  if (ghostBtn) ghostBtn.hidden = true;
  if (menuBtn)  menuBtn.hidden  = true;

  // スクショ3（シルエット：画面いっぱい）
  buildGameSilhouettes();

  // スクショ4（dokokana表示はするが、押させない）
  hide(dokokanaBtn);
  window.setTimeout(() => {
    show(dokokanaBtn);
    // どこタップでも開始
    armGameStartTap();
  }, 420);
}

function goStart(){
  hide(drawer);
  hide(popup);
  hide(dokokanaBtn);

  // シルエット掃除
  const layer = stage ? stage.querySelector(".silhouette-layer") : null;
  if (layer) layer.remove();

  screenGame.classList.remove("is-active");
  screenStart.classList.add("is-active");

  // START演出を再生成
  startSequence();
}

// =========================
// Start animation helpers
// =========================
function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function getScaleFromData(id){
  // 1) COBAKE_DATA.scale があれば最優先
  const list = window.COBAKE_DATA || [];
  const hit = list.find(x => x && x.id === id);
  if (hit && typeof hit.scale === "number" && hit.scale > 0) return hit.scale;

  // 2) 指定された scale（フォールバック）
  const fallback = {
    pipple: 1.0,
    ruru: 0.8,
    fuuu: 0.5,
    vazuu: 0.6,
    coin: 0.6,
    musshu: 2.5,
    coron: 2.0,
    monja: 2.4,
    well: 3.0,
    wonka: 1.5
  };
  const s = fallback[id];
  return (typeof s === "number" && s > 0) ? s : 1.0;
}

/**
 * START画面：
 * - 配置「枠」は維持しつつ、表示コバケを毎回ランダムに入れ替える
 * - フッター（下端）に被らないように、全キャラを一定量（8%）持ち上げる
 */
const START_LAYOUT = [
  { cx: 0.20, bottom: 0.01, z: 10 },
  { cx: 0.88, bottom: 0.00, z: 8  },
  { cx: 0.96, bottom: -0.02, z: 9  },

  { cx: 0.67, bottom: 0.11, z: 4  },

  { cx: 0.56, bottom: 0.00, z: 7  },
  { cx: 0.36, bottom: 0.00, z: 6  },

  { cx: 0.73, bottom: 0.00, z: 6  },
  { cx: 0.79, bottom: 0.00, z: 6  },
  { cx: 0.64, bottom: 0.00, z: 6  },
  { cx: 0.59, bottom: 0.03, z: 6  }
];

function startSequence(){
  const list = window.COBAKE_DATA || [];
  startPopArea.innerHTML = "";
  hide(startBtn);

  const rect = (startLayer || startPopArea).getBoundingClientRect();
  const W = rect.width;

  // pop timing
  const baseDelay = 120; // ms
  const stepDelay = 120; // ms

  // pipple=1.0 の見た目基準（CSSの start-pop width:220px に合わせる）
  const baseW = 220;

  // 画面外防止（巨大スケールでも最大この幅まで）
  const maxW = W * 0.60;

  // フッター被り防止：全体を8%持ち上げ（CSS既定 bottom:8% と同じ）
  const baseBottom = 0.08;
  const minBottom  = 0.06;

  // ids を毎回ランダム化（表示が固定化しないように）
  const ids = list.map(c => c.id);
  for (let i = ids.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // 枠数ぶん配置（余りは末尾に安全配置）
  const slots = START_LAYOUT.slice();
  const extraDefault = { cx: 0.90, bottom: 0.00, z: 5 };

  const orderedPairs = ids.map((id, idx) => {
    const slot = slots[idx] || extraDefault;
    return { id, slot };
  });

  orderedPairs.forEach(({ id, slot }, idx) => {
    const c = list.find(x => x.id === id) || { id };

    const img = document.createElement("img");
    img.className = "start-pop";
    img.src = `./assets/img/cobake/monokuro/color/${c.id}.png`;
    img.alt = "";
    img.draggable = false;

    // size
    const s = getScaleFromData(c.id);
    const w0 = baseW * s;
    const w  = Math.min(w0, maxW);
    img.style.width = `${w}px`;
    img.style.height = "auto";

    // position (center-x)
    const left = clamp((W * slot.cx) - (w / 2), 0, Math.max(0, W - w));
    img.style.left = `${left}px`;

    // position (bottom) : baseBottom + slot.bottom（下端のフッターに被らない）
    const b = Math.max(minBottom, baseBottom + (slot.bottom || 0));
    img.style.bottom = `${b * 100}%`;

    // layering（STARTボタンより必ず背面にする）
    const z = slot.z || 5;
    img.style.zIndex = String(Math.min(z, 50));

    // timing
    img.style.animationDelay = `${baseDelay + stepDelay * idx}ms`;

    startPopArea.appendChild(img);
  });

  // show start button after last pop
  const total = baseDelay + stepDelay * orderedPairs.length + 650;
  window.setTimeout(() => show(startBtn), total);
}

startBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  goGame();
});

if (dokokanaBtn){
  // dokokanaは「表示」だけ（操作は stage のどこタップでも開始）
  dokokanaBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 何もしない（誤タップで即開始しない）
  });
}

// =========================
// Drawer list (monokuro)
// =========================
function buildCobakeList(){
  const list = Array.isArray(window.COBAKE_DATA) ? [...window.COBAKE_DATA] : [];
  cobakeList.innerHTML = "";

  // 右枠内もランダム順（既存方針を維持）
  for (let i = list.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

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

    // クリック選択ではなく「ドラッグ→ドロップ」にする
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startDragFromDrawer(e, c.id);
    });

    cobakeList.appendChild(btn);
  });
}

/**
 * 複数ピース対応：削除しない
 * drop位置指定可
 */
function createPiece(id, leftPx, topPx){
  if (!stage) return null;

  const img = document.createElement("img");
  img.className = "piece";
  img.src = `./assets/img/cobake/monokuro/monokuro/${id}.png`;
  img.alt = id;
  img.draggable = false;

  // 状態（拡大・回転）
  img.dataset.scale = "1";
  img.dataset.rot = "0";

  img.style.position = "absolute";
  img.style.left = `${leftPx}px`;
  img.style.top  = `${topPx}px`;
  img.style.transform = `translate(-50%, -50%) rotate(0deg) scale(1)`;

  stage.appendChild(img);
  return img;
}

// 互換：既存呼び出しが残っていても中心に出す
function spawnPiece(id){
  if (!stage) return;
  const r = stage.getBoundingClientRect();
  createPiece(id, r.width * 0.5, r.height * 0.5);
}

// =========================
// UI open/close
// =========================
ghostBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  // toggle drawer (character list)
  if (drawer.hidden){
    buildCobakeList(); // 開くたびランダム
    show(drawer);
    hide(popup);
  } else {
    hide(drawer);
  }
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
// Drag/Pinch/Rotate/Delete for .piece (Pointer Events)
// =========================
(function enablePieceGestures(){
  if (!stage) return;

  // drawer drag ghost
  let dragGhost = null;
  let draggingId = null;

  // piece gesture state
  let activeEl = null;
  const pts = new Map(); // pointerId -> {x,y}
  let startDist = 0;
  let startAng = 0;
  let startScale = 1;
  let startRot = 0;
  let dragOffset = { dx: 0, dy: 0 };

  // double tap delete (touch/pen)
  const lastTap = new WeakMap(); // el -> {t, x, y}

  function stageRect(){ return stage.getBoundingClientRect(); }

  function localXY(clientX, clientY){
    const r = stageRect();
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  }

  function getScale(el){
    const v = Number(el.dataset.scale);
    return Number.isFinite(v) ? v : 1;
  }
  function getRot(el){
    const v = Number(el.dataset.rot);
    return Number.isFinite(v) ? v : 0;
  }
  function applyTransform(el){
    const s = getScale(el);
    const r = getRot(el);
    el.style.transform = `translate(-50%, -50%) rotate(${r}deg) scale(${s})`;
  }

  function dist(a, b){
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function angle(a, b){
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  // ===== Drawer Drag & Drop =====
  window.startDragFromDrawer = function(e, id){
    draggingId = id;

    // ghost element
    if (dragGhost) dragGhost.remove();
    dragGhost = document.createElement("img");
    dragGhost.src = `./assets/img/cobake/monokuro/monokuro/${id}.png`;
    dragGhost.alt = "";
    dragGhost.draggable = false;
    dragGhost.style.position = "fixed";
    dragGhost.style.left = `${e.clientX}px`;
    dragGhost.style.top = `${e.clientY}px`;
    dragGhost.style.transform = "translate(-50%, -50%)";
    dragGhost.style.width = "96px";
    dragGhost.style.height = "auto";
    dragGhost.style.pointerEvents = "none";
    dragGhost.style.zIndex = "9999";
    dragGhost.style.opacity = "0.92";
    document.body.appendChild(dragGhost);

    // capture pointer on button
    const t = e.target;
    if (t && t.setPointerCapture) t.setPointerCapture(e.pointerId);

    function move(ev){
      if (!dragGhost) return;
      dragGhost.style.left = `${ev.clientX}px`;
      dragGhost.style.top = `${ev.clientY}px`;
    }

    function end(ev){
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", end, true);

      if (dragGhost){ dragGhost.remove(); dragGhost = null; }

      if (!stage || !draggingId) { draggingId = null; return; }

      const r = stageRect();
      const inside = (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom);

      if (inside){
        const p = localXY(ev.clientX, ev.clientY);
        createPiece(draggingId, p.x, p.y);
      }

      draggingId = null;
    }

    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
  };

  // ===== Piece gestures =====
  stage.addEventListener("dblclick", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("piece")) return;
    e.preventDefault();
    e.stopPropagation();
    t.remove();
  });

  stage.addEventListener("pointerdown", (e) => {
    const t = e.target;

    const hitPiece =
      (t instanceof HTMLElement) &&
      t.classList.contains("piece");

    // 1本目：piece上のみ開始
    // 2本目以降：activeEl があれば stage 上でも拾う（画像外に指が出てもピンチ/回転成立）
    if (!hitPiece && !activeEl) return;

    e.preventDefault();
    e.stopPropagation();

    if (hitPiece) activeEl = t;

    if (activeEl && activeEl.setPointerCapture){
      activeEl.setPointerCapture(e.pointerId);
    }

    // piece をタップしたときのみ、ダブルタップ判定・ドラッグ基準を更新
    if (hitPiece){
      // double tap (touch/pen)
      const now = Date.now();
      const prev = lastTap.get(activeEl);
      if (prev && (now - prev.t) < 320){
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        if ((dx*dx + dy*dy) < (18*18)){
          activeEl.remove();
          lastTap.delete(activeEl);
          activeEl = null;
          pts.clear();
          return;
        }
      }
      lastTap.set(activeEl, { t: now, x: e.clientX, y: e.clientY });

      // prepare drag offset for 1-finger move
      const p = localXY(e.clientX, e.clientY);
      const curLeft = Number.parseFloat(activeEl.style.left) || p.x;
      const curTop  = Number.parseFloat(activeEl.style.top)  || p.y;
      dragOffset = { dx: curLeft - p.x, dy: curTop - p.y };
    }

    // register pointer
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // prepare pinch/rotate baseline if 2 pointers
    if (pts.size === 2){
      const arr = Array.from(pts.values());
      startDist = dist(arr[0], arr[1]);
      startAng = angle(arr[0], arr[1]);
      startScale = getScale(activeEl);
      startRot = getRot(activeEl);
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!activeEl) return;
    if (!pts.has(e.pointerId)) return;

    e.preventDefault();

    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2 pointers => pinch/rotate
    if (pts.size >= 2){
      const arr = Array.from(pts.values());
      const d = dist(arr[0], arr[1]);
      const a = angle(arr[0], arr[1]);

      if (startDist > 0){
        const nextScale = Math.max(0.2, Math.min(6, startScale * (d / startDist)));
        const nextRot = startRot + ((a - startAng) * 180 / Math.PI);

        activeEl.dataset.scale = String(nextScale);
        activeEl.dataset.rot = String(nextRot);
        applyTransform(activeEl);
      }
      return;
    }

    // 1 pointer => move
    const p = localXY(e.clientX, e.clientY);
    activeEl.style.left = `${p.x + dragOffset.dx}px`;
    activeEl.style.top  = `${p.y + dragOffset.dy}px`;
    applyTransform(activeEl);
  });

  function endPointer(e){
    if (!activeEl) return;
    if (pts.has(e.pointerId)) pts.delete(e.pointerId);

    if (pts.size < 2){
      startDist = 0;
      startAng = 0;
      startScale = getScale(activeEl);
      startRot = getRot(activeEl);
    }

    if (pts.size === 0){
      activeEl = null;
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
