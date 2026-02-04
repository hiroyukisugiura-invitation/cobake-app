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

  // 既存シルエットを掃除
  const old = stage.querySelector(".silhouette-layer");
  if (old) old.remove();

  const layer = document.createElement("div");
  layer.className = "silhouette-layer";
  stage.appendChild(layer);

  const rect = stage.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  // 深緑枠に被らない安全マージン（永久に枠外NG）
  const mLeft   = Math.round(W * 0.07);
  const mRight  = Math.round(W * 0.07);
  const mTop    = Math.round(H * 0.08);
  const mBottom = Math.round(H * 0.08);

  const list = window.COBAKE_DATA || [];
  const ids = list.map(c => c.id);

  // 10体固定（足りなければあるだけ）
  const pickCount = Math.min(10, ids.length);

  // ids を毎回ランダム化
  for (let i = ids.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const picked = ids.slice(0, pickCount);

  // 密度：大→小（10体想定）
  const tiers = [];
  const pushMany = (ratio, n) => { for (let i=0;i<n;i++) tiers.push(ratio); };

  if (pickCount >= 10){
    pushMany(0.40, 2);
    pushMany(0.30, 3);
    pushMany(0.22, 3);
    pushMany(0.16, 2);
  } else {
    pushMany(0.38, Math.max(1, Math.floor(pickCount * 0.2)));
    pushMany(0.28, Math.max(1, Math.floor(pickCount * 0.3)));
    pushMany(0.20, Math.max(1, Math.floor(pickCount * 0.3)));
    while (tiers.length < pickCount) tiers.push(0.16);
    tiers.length = pickCount;
  }

  // 画像比率を取得
  const loadOne = (id) => new Promise((resolve) => {
    const src = `./assets/img/cobake/monokuro/bk/${id}.png`;
    const im = new Image();
    im.onload = () => {
      const ratio = (im.naturalWidth > 0) ? (im.naturalHeight / im.naturalWidth) : 1.2;
      resolve({ id, src, ratio });
    };
    im.onerror = () => resolve({ id, src, ratio: 1.2 });
    im.src = src;
  });

  // 0/90/180/270 のみ（回転しても枠外NGを満たすため）
  const rots = [0, 90, 180, 270];
  const pickRot = () => rots[Math.floor(Math.random() * rots.length)];

  Promise.all(picked.map(loadOne)).then((loaded) => {
    // 大きい順に配置
    const order = loaded.map((o, i) => ({ ...o, baseRatio: tiers[i] }))
      .sort((a,b) => b.baseRatio - a.baseRatio);

    // 被り判定（トップ左基準のAABB）
    const placed = [];
    const pad = Math.round(Math.min(W, H) * 0.012); // 余白

    function intersects(a, b){
      return !(
        a.x2 <= b.x1 || b.x2 <= a.x1 ||
        a.y2 <= b.y1 || b.y2 <= a.y1
      );
    }

    order.forEach(({ src, ratio, baseRatio }, idx) => {
      // 回転を先に決める（90/270は w/h が入れ替わる）
      const rot = pickRot();

      // サイズ（開始ごとに少し揺らす）
      const jitter = 0.92 + Math.random() * 0.20;

      // まず「非回転の幅」を決める
      let iw = Math.round(W * baseRatio * jitter);
      let ih = Math.round(iw * ratio);

      // 表示ボックス（回転後の当たり判定サイズ）
      let bw = (rot === 90 || rot === 270) ? ih : iw;
      let bh = (rot === 90 || rot === 270) ? iw : ih;

      // 枠内に必ず収まる上限でクリップ
      const maxBW = Math.max(24, (W - mLeft - mRight));
      const maxBH = Math.max(24, (H - mTop - mBottom));

      // 大きすぎる場合は縮小（比率維持）
      const s1 = Math.min(1, maxBW / bw);
      const s2 = Math.min(1, maxBH / bh);
      const sCap = Math.min(s1, s2);

      iw = Math.max(24, Math.round(iw * sCap));
      ih = Math.max(24, Math.round(ih * sCap));
      bw = (rot === 90 || rot === 270) ? ih : iw;
      bh = (rot === 90 || rot === 270) ? iw : ih;

      // 置けるまで試行（縮小しながら、必ず枠内）
      let ok = false;
      let x = 0, y = 0;

      for (let pass = 0; pass < 6 && !ok; pass++){
        const shrink = 1 - pass * 0.10; // 1.0→0.5
        const bww = Math.max(24, Math.round(bw * shrink));
        const bhh = Math.max(24, Math.round(bh * shrink));

        const xMin = mLeft;
        const xMax = Math.max(xMin, W - mRight - bww);
        const yMin = mTop;
        const yMax = Math.max(yMin, H - mBottom - bhh);

        for (let t = 0; t < 900; t++){
          x = Math.round(xMin + Math.random() * (xMax - xMin));
          y = Math.round(yMin + Math.random() * (yMax - yMin));

          const cand = { x1: x - pad, y1: y - pad, x2: x + bww + pad, y2: y + bhh + pad };

          let hit = false;
          for (const p of placed){
            if (intersects(cand, p)){ hit = true; break; }
          }
          if (!hit){
            placed.push(cand);
            // 確定サイズをここで採用
            bw = bww;
            bh = bhh;
            ok = true;
            break;
          }
        }
      }

      // 最終フォールバック（それでも置けない場合：最小で縦に並べる）
      if (!ok){
        bw = Math.min(bw, Math.max(24, Math.round(W * 0.14)));
        bh = Math.min(bh, Math.max(24, Math.round(H * 0.18)));
        x = mLeft;
        y = Math.min(H - mBottom - bh, mTop + idx * Math.round(bh * 0.55));
      }

      // ボックス（枠内保証）
      const box = document.createElement("div");
      box.className = "silhouette-box";
      box.style.position = "absolute";
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${bw}px`;
      box.style.height = `${bh}px`;
      box.style.pointerEvents = "none";
      box.style.zIndex = "80";

      // 画像（ボックス中央に置いて回転）
      const img = document.createElement("img");
      img.className = "silhouette";
      img.src = src;
      img.alt = "";
      img.draggable = false;
      img.style.position = "absolute";
      img.style.left = "50%";
      img.style.top = "50%";

      // 画像は回転前のサイズで描画（90/270でもボックスに収まる）
      // 回転後にボックス内へ収めるため、maxを使ってフィットさせる
      const drawW = (rot === 90 || rot === 270) ? bh : bw;
      const drawH = (rot === 90 || rot === 270) ? bw : bh;

      img.style.width = `${drawW}px`;
      img.style.height = "auto";
      img.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;

      box.appendChild(img);
      layer.appendChild(box);
    });
  });
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
