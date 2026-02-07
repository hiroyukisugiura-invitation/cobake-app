// =========================
// Screens
// =========================
const screenStart = document.getElementById("screenStart");
const screenGame  = document.getElementById("screenGame");

const startBtn     = document.getElementById("startBtn");
const startPopArea = document.getElementById("startPopArea");
const startLayer   = document.getElementById("startLayer");

// START UI は固定（文字入り専用PNGを使用）
const startBg = document.getElementById("startBg");

// GAME 用：ゲーム開始の度に1色決定（毎回変える）
const GAME_COLORS = ["green", "blue", "pink", "yellow"];

// グローバル共有（後続で使用）
window.COBakeTheme = {
  color: "green"
};

function applyGameTheme(){
  const c = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
  window.COBakeTheme.color = c;

  const map = {
    green:  "#baf7b8",
    blue:   "#b9e6ff",
    pink:   "#ffd0e4",
    yellow: "#fff2a6"
  };

  // stage 背景は常に即時反映
  if (stage){
    stage.style.backgroundColor = map[c] || "#baf7b8";
  }

  // gameBg は DOM 構築後でないと null になる環境があるため、必ず存在確認
  const gameBg = document.getElementById("gameBg");
  if (!gameBg) return;

  // src を一度クリアしてから差し替え（Safari / iOS 対策）
  gameBg.src = "";
  gameBg.removeAttribute("src");

  // 次フレームで確実に反映
  requestAnimationFrame(() => {
    gameBg.src = `/assets/ui/game_${c}.png`;
  });
}

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
const regPopup  = document.getElementById("regPopup");
const regMask   = document.getElementById("regMask");
const regClose  = document.getElementById("regClose");
const regFrame  = document.getElementById("regFrame");
const regTitle  = document.getElementById("regTitle");

function ensureRegLoading(){
  let el = document.querySelector(".reg-loading");
  if (el) return el;

  el = document.createElement("div");
  el.className = "reg-loading";
  el.textContent = "Loading";
  regPopup.querySelector(".reg-panel").appendChild(el);
  return el;
}

function titleFromUrl(url){
  if (!url) return "Regulations";
  if (url.includes("transactions")) return "特定商取引法";
  if (url.includes("terms_of_service")) return "利用規約";
  if (url.includes("privacy_policy")) return "プライバシーポリシー";
  return "Regulations";
}

function openRegPopup(url){
  if (!regPopup || !regFrame) return;

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";

  const loading = ensureRegLoading();
  loading.style.display = "grid";

  if (regTitle) regTitle.textContent = titleFromUrl(url);

  regFrame.src = "";
  show(regPopup);

  window.setTimeout(() => {
    regFrame.src = url || "";
  }, 0);

  hide(drawer);
  hide(popup);
}

function closeRegPopup(){
  if (!regPopup || !regFrame) return;

  hide(regPopup);
  regFrame.src = "";

  const loading = document.querySelector(".reg-loading");
  if (loading) loading.style.display = "none";

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = "";

  hide(drawer);
  hide(popup);
}

/* iframe load -> hide loading */
if (regFrame){
  regFrame.addEventListener("load", () => {
    const loading = document.querySelector(".reg-loading");
    if (loading) loading.style.display = "none";
  });
}

/* extra shortcuts */
document.addEventListener("keydown", (e) => {
  if (!regPopup || regPopup.hidden) return;
  if (e.key === "Escape") closeRegPopup();
});

document.addEventListener("touchstart", (e) => {
  if (!regPopup || regPopup.hidden) return;
  if (e.touches && e.touches.length === 2) closeRegPopup();
});

function closeRegPopup(){
  if (!regPopup || !regFrame) return;

  hide(regPopup);

  // 閉じたら必ず空にする（次回スクロール位置保持を防ぐ）
  regFrame.src = "";

  // 背面スクロール復帰
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = "";

  // 他UIは閉じる
  hide(drawer);
  hide(popup);
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
    box.dataset.id = id;
    box.dataset.filled = "0";
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
    img.src = `/assets/img/cobake/bk/${id}.png`;
    img.alt = "";
    img.draggable = false;
    img.style.position = "absolute";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";

    // 輪郭マスク用（CSSで var(--mask-url) を参照）
    box.style.setProperty("--mask-url", `url("/assets/img/cobake/bk/${id}.png")`)

    const rot = pickRot();

    // 90/270 のときは縦横が入れ替わるため、ボックス内に収まるように縮小する
    // （overflow:hidden による切れを永久に防ぐ）
    let scale = 1;
    if (rot === 90 || rot === 270){
      scale = Math.min(bw / bh, bh / bw); // <= 1 になる
    }

    // snap判定用にシルエット側の回転を保持
    box.dataset.rot = String(rot);

    // 輪郭なぞり光の整列用（CSSで使用）
    box.style.setProperty("--sil-rot", `${rot}deg`);
    box.style.setProperty("--sil-scale", String(scale));

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

  // ゲーム開始の度にテーマ色を適用
  applyGameTheme();

  // レイアウト確定後に必ずシルエット生成
  requestAnimationFrame(() => {
    syncStageSize();        // stage サイズを確定
    buildGameSilhouettes(); // ここで初めて生成
  });

  // GAME遷移直後に即ガイド表示（待ち時間ゼロ）
  show(dokokanaBtn);
  armGameStartTap();
}

function goStart(){
  hide(drawer);
  hide(popup);
  hide(dokokanaBtn);

  // ===== GAME状態を完全リセット =====

  // 置いたピースを全削除（前回状態の残りを防止）
  if (stage){
    stage.querySelectorAll(".piece").forEach((el) => el.remove());
  }

  // シルエット掃除
  const layer = stage ? stage.querySelector(".silhouette-layer") : null;
  if (layer) layer.remove();

  // ゲームUIは非表示に戻す（次回開始時に正しく出す）
  if (ghostBtn) ghostBtn.hidden = true;
  if (menuBtn)  menuBtn.hidden  = true;

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
const START_LAYOUT =
  (window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches)
    ? [
        // mobile (iPhone): この形をベースに後でDevで微調整する前提
        { cx: 0.18, bottom: 0.00, z: 10 }, // big-left
        { cx: 0.82, bottom: 0.00, z: 10 }, // big-right

        { cx: 0.30, bottom: 0.00, z: 7  }, // mid-left
        { cx: 0.70, bottom: 0.00, z: 7  }, // mid-right

        { cx: 0.18, bottom: 0.06, z: 6  }, // small cluster
        { cx: 0.30, bottom: 0.06, z: 6  },
        { cx: 0.50, bottom: 0.05, z: 6  },
        { cx: 0.70, bottom: 0.06, z: 6  },
        { cx: 0.82, bottom: 0.06, z: 6  },

        { cx: 0.50, bottom: 0.11, z: 5  }  // top-small
      ]
    : [
        // desktop (existing)
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

  // pipple=1.0 の見た目基準（スマホは少し小さめ）
  const isMobile = (window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);

  const baseW = isMobile ? 200 : 220;

  // 画面外防止（巨大スケールでも最大この幅まで）
  const maxW = isMobile ? (W * 0.78) : (W * 0.60);

  // フッター被り防止：スマホはホームバー分を考慮して持ち上げを弱める
  const baseBottom = isMobile ? 0.06 : 0.08;
  const minBottom  = isMobile ? 0.05 : 0.06;

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
    img.src = `/assets/img/cobake/color/${c.id}.png`;
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
           src="/assets/img/cobake/monokuro/monokuro/${c.id}.png"
           alt="${c.name}"
           draggable="false" />
    `;

    // クリック選択ではなく「ドラッグ→ドロップ」にする
btn.addEventListener("pointerdown", (e) => {
  // iPhone：スクロール優先。長押し(180ms)でドラッグ開始
  if (e.pointerType === "touch") {
    let moved = false;
    let started = false;

    const startTimer = window.setTimeout(() => {
      if (moved) return;
      started = true;
      e.preventDefault();
      e.stopPropagation();
      startDragFromDrawer(e, c.id);
    }, 180);

    const onMove = () => {
      moved = true;
      window.clearTimeout(startTimer);
    };

    const onUp = (ev) => {
      window.clearTimeout(startTimer);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      if (started) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    return;
  }

  // PC：即ドラッグ開始
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

  // 座標が不正（NaN/Infinity/undefined）なら中央に落とす
  const r = stage.getBoundingClientRect();
  const cx0 = r.width * 0.5;
  const cy0 = r.height * 0.5;

  let x = Number(leftPx);
  let y = Number(topPx);

  if (!Number.isFinite(x)) x = cx0;
  if (!Number.isFinite(y)) y = cy0;

  // 必ずステージ内に収める（左上0固定事故を防ぐ）
  x = Math.max(0, Math.min(r.width,  x));
  y = Math.max(0, Math.min(r.height, y));

  // piece container（子要素を持てるように img → div に変更）
  const el = document.createElement("div");
  el.className = "piece";
  el.dataset.id = id;

  // 状態（拡大・回転）
  el.dataset.scale = "1";
  el.dataset.rot = "0";

  el.style.position = "absolute";
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  el.style.transform = `translate(-50%, -50%) rotate(0deg) scale(1)`;
  el.style.transformOrigin = "50% 50%";

  // 輪郭マスク用（CSSで var(--mask-url) を参照）
  el.style.setProperty("--mask-url", `url("/assets/img/cobake/monokuro/monokuro/${id}.png")`);

  // iOS/PC共通：誤選択・ドラッグ画像防止
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";

  // 中身（画像 + ハンドル）
  el.innerHTML = `
    <img
      class="piece-img"
      src="/assets/img/cobake/monokuro/monokuro/${id}.png"
      alt="${id}"
      draggable="false"
      style="
        display:block;
        width:100%;
        height:auto;
        pointer-events:none;
        -webkit-user-drag:none;
        user-select:none;
      "
    />
    <button
      type="button"
      class="piece-handle piece-handle-rotate"
      data-handle="rotate"
      aria-label="rotate"
      style="
        position:absolute;
        right:-12px;
        top:-12px;
        width:28px;
        height:28px;
        border:0;
        padding:0;
        border-radius:999px;
        background:rgba(255,255,255,0.92);
        box-shadow:0 2px 8px rgba(0,0,0,0.18);
        display:none;
        touch-action:none;
        cursor:grab;
      "
    >↻</button>
    <button
      type="button"
      class="piece-handle piece-handle-scale"
      data-handle="scale"
      aria-label="scale"
      style="
        position:absolute;
        right:-12px;
        bottom:-12px;
        width:28px;
        height:28px;
        border:0;
        padding:0;
        border-radius:999px;
        background:rgba(255,255,255,0.92);
        box-shadow:0 2px 8px rgba(0,0,0,0.18);
        display:none;
        touch-action:none;
        cursor:nwse-resize;
      "
    >↘</button>
  `;

  stage.appendChild(el);
  return el;
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
  let prevActiveEl = null;

  const pts = new Map(); // pointerId -> {x,y}
  let startDist = 0;
  let startAng = 0;
  let startScale = 1;
  let startRot = 0;
  let dragOffset = { dx: 0, dy: 0 };

  // PC handle mode（1 pointer）
  let mode = "move"; // "move" | "rotate" | "scale"
  let center0 = { x: 0, y: 0 }; // client coords
  let oneStartAng = 0;          // rad
  let oneStartDist = 0;         // px

  // double tap delete (touch/pen)
  const lastTap = new WeakMap(); // el -> {t, x, y}

  // hint timers (piece -> timeoutId)
  const hintTimers = new WeakMap();

  // =========================
  // Sound (File priority + WebAudio fallback)
  // =========================
  // window.COBAKE_SOUND = {
  //   snap:     { src: "./sounds/snap.mp3", volume: 0.9, enabled: true },
  //   complete: { src: "./sounds/complete.mp3", volume: 1.0, enabled: true }
  // };
  const SOUND_DEFAULT = {
    snap:     { src: "", volume: 1.0, enabled: true },
    complete: { src: "", volume: 1.0, enabled: true }
  };

  const audioCache = new Map(); // key -> HTMLAudioElement

  function getSoundConf(key){
    const u = (window.COBAKE_SOUND && typeof window.COBAKE_SOUND === "object") ? window.COBAKE_SOUND : {};
    const base = SOUND_DEFAULT[key] || { src:"", volume:1.0, enabled:true };
    const o = u[key] || {};
    return {
      src: (typeof o.src === "string") ? o.src : base.src,
      volume: (typeof o.volume === "number") ? o.volume : base.volume,
      enabled: (typeof o.enabled === "boolean") ? o.enabled : base.enabled
    };
  }

  function playSoundFile(key){
    const conf = getSoundConf(key);
    if (!conf.enabled) return false;
    if (!conf.src) return false;

    let a = audioCache.get(key);
    if (!(a instanceof HTMLAudioElement)){
      a = new Audio(conf.src);
      a.preload = "auto";
      audioCache.set(key, a);
    } else {
      if (a.src && !a.src.endsWith(conf.src)){
        a.src = conf.src;
      }
    }

    a.volume = Math.max(0, Math.min(1, conf.volume));

    try { a.currentTime = 0; } catch(_){}

    const p = a.play();
    if (p && typeof p.catch === "function"){
      p.catch(() => {});
    }
    return true;
  }

  // tiny click sound (no asset)
  let audioCtx = null;
  function ensureAudio(){
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  // iOS対策：ユーザー操作で AudioContext を必ず unlock
  (function unlockAudioOnGesture(){
    let done = false;

    function unlock(){
      if (done) return;
      done = true;

      const ctx = ensureAudio();
      if (!ctx) return;

      if (ctx.state === "suspended"){
        ctx.resume().catch(() => {});
      }

      // silent tick（iOSで確実に開始させる）
      try{
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        o.start(0);
        o.stop(0.01);
      }catch(_){}
    }

    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("touchstart", unlock, { once: true, capture: true });
  })();

  function playKachi(){
    // 1) file priority
    if (playSoundFile("snap")) return;

    // 2) WebAudio fallback
    const ctx = ensureAudio();
    if (!ctx) return;

    if (ctx.state === "suspended"){
      ctx.resume().catch(() => {});
    }

    const t0 = ctx.currentTime;

    // キラーン!!：上昇ピッチ + きらめき + 余韻
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.42, t0 + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);
    master.connect(ctx.destination);

    function ping(freq, start, dur, peak){
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.setValueAtTime(freq, start);
      o.frequency.exponentialRampToValueAtTime(freq * 1.35, start + Math.min(0.06, dur));

      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      o.connect(g);
      g.connect(master);

      o.start(start);
      o.stop(start + dur);

      o.onended = () => {
        try { o.disconnect(); } catch(_){}
        try { g.disconnect(); } catch(_){}
      };
    }

    ping(1245, t0 + 0.00, 0.20, 0.28);
    ping(1660, t0 + 0.05, 0.26, 0.22);
    ping(2489, t0 + 0.10, 0.18, 0.14);

    // きらめきノイズ
    const noiseDur = 0.09;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++){
      const t = i / data.length;
      const env = Math.exp(-t * 7.5);
      data[i] = (Math.random() * 2 - 1) * 0.30 * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(3200, t0);

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(hp);
    hp.connect(ng);
    ng.connect(master);

    noise.start(t0 + 0.015);
    noise.stop(t0 + 0.015 + noiseDur);

    noise.onended = () => {
      try { noise.disconnect(); } catch(_){}
      try { hp.disconnect(); } catch(_){}
      try { ng.disconnect(); } catch(_){}
      try { master.disconnect(); } catch(_){}
    };
  }

  function checkAllFilled(){
    const boxes = stage ? stage.querySelectorAll(".silhouette-box") : [];
    if (!boxes.length) return false;
    for (const b of boxes){
      if (b.dataset.filled !== "1") return false;
    }
    return true;
  }

function playFinishFanfare(){
  // 1) file priority
  if (playSoundFile("complete")) return;

  // 2) WebAudio fallback（祝福ファンファーレ）
  const ctx = ensureAudio();
  if (!ctx) return;

  if (ctx.state === "suspended"){
    ctx.resume().catch(() => {});
  }

  const t0 = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.45, t0 + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
  master.connect(ctx.destination);

  function tone(freq, start, dur, peak, type="triangle"){
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(master);
    o.start(start);
    o.stop(start + dur);
  }

  // メインコード（明るい長調・上昇）
  // C5 → E5 → G5 → C6
  tone(523.25, t0 + 0.00, 0.55, 0.28);
  tone(659.25, t0 + 0.12, 0.55, 0.26);
  tone(783.99, t0 + 0.24, 0.55, 0.24);
  tone(1046.50, t0 + 0.36, 0.85, 0.30);

  // ハーモニー（少し遅れて厚みを出す）
  tone(659.25, t0 + 0.40, 0.70, 0.18, "sine");
  tone(783.99, t0 + 0.52, 0.70, 0.16, "sine");

  // きらめき（高音ベル）
  const sparkle = [1567.98, 2093.00]; // G6 C7
  sparkle.forEach((f, i) => {
    tone(f, t0 + 0.30 + i * 0.08, 0.35, 0.14, "sine");
  });

  // 軽いシンバル風ノイズ
  const noiseDur = 0.25;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++){
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6) * 0.25;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(3000, t0);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0 + 0.28);
  ng.gain.exponentialRampToValueAtTime(0.18, t0 + 0.30);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.60);

  noise.connect(hp);
  hp.connect(ng);
  ng.connect(master);

  noise.start(t0 + 0.28);
  noise.stop(t0 + 0.28 + noiseDur);
}

    function showHazimekaraOverlay(){
    if (!stage) return;

    // 二重表示防止
    if (stage.querySelector(".hazimekara-overlay")) return;

    // 他UIは閉じる
    hide(drawer);
    hide(popup);

    // ステージ全面のオーバーレイ
    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "hazimekara-overlay";
    overlay.setAttribute("aria-label", "はじめから");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.border = "0";
    overlay.style.padding = "0";
    overlay.style.margin = "0";
    overlay.style.background = "transparent";
    overlay.style.cursor = "pointer";
    overlay.style.zIndex = "9999";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";

    const img = document.createElement("img");
    img.src = "/button/hazimekara.png";
    img.alt = "はじめから";
    img.draggable = false;
    img.style.width = "min(720px, 30%)";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.userSelect = "none";
    img.style.webkitUserDrag = "none";
    img.style.filter = "drop-shadow(0 18px 36px rgba(0,0,0,.22))";

    overlay.appendChild(img);

overlay.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  // オーバーレイ削除
  overlay.remove();

  // ゲーム状態を初期化（スタート画面には戻らない）
  hide(drawer);
  hide(popup);
  hide(dokokanaBtn);

  // 既存シルエットを一旦削除
  const layer = stage.querySelector(".silhouette-layer");
  if (layer) layer.remove();

  // シルエット再生成
  buildGameSilhouettes();

  // 「コバケどこかな？」を表示して、どこタップでも開始状態へ
  show(dokokanaBtn);
  armGameStartTap();
});

    stage.appendChild(overlay);
  }

  function trySnap(piece){
    if (!piece) return false;
    if (piece.dataset.snapped === "1") return true;

    const id = piece.dataset.id || "";
    if (!id) return false;

    const box = stage.querySelector(`.silhouette-box[data-id="${id}"]`);
    if (!(box instanceof HTMLElement)) return false;
    if (box.dataset.filled === "1") return false;

    const br = box.getBoundingClientRect();
    const sr = stageRect();

    const boxCx = (br.left - sr.left) + br.width / 2;
    const boxCy = (br.top - sr.top) + br.height / 2;

    const pieceLeft = Number.parseFloat(piece.style.left) || 0;
    const pieceTop  = Number.parseFloat(piece.style.top)  || 0;

    const dx = pieceLeft - boxCx;
    const dy = pieceTop - boxCy;
    const d = Math.hypot(dx, dy);

    // 子供向け：位置のみで吸着判定（嵌め込みはシルエット側で固定）
    const thr = Math.max(18, Math.min(64, Math.min(br.width, br.height) * 0.26));
    if (d > thr) return false;

    // シルエット側にカラーをピッチリ嵌め込む
    const sil = box.querySelector(".silhouette");
    const tf = (sil && sil.style && sil.style.transform) ? sil.style.transform : "translate(-50%, -50%)";

    let filled = box.querySelector(".silhouette-filled");
    if (!(filled instanceof HTMLImageElement)){
      filled = document.createElement("img");
      filled.className = "silhouette-filled";
      filled.alt = "";
      filled.draggable = false;
      filled.style.position = "absolute";
      filled.style.left = "50%";
      filled.style.top = "50%";
      filled.style.width = "100%";
      filled.style.height = "100%";
      filled.style.objectFit = "contain";
      filled.style.pointerEvents = "none";
      filled.style.zIndex = "90";
      box.appendChild(filled);
    }

    filled.src = `/assets/img/cobake/color/${id}.png`;

    // CSSのアニメーションが transform を上書きして「回転が戻る」事故を防ぐ
    filled.style.animation = "none";

    // silhouette の transform をベースに、カラーだけ少し大きくして黒のはみ出しを防ぐ
    filled.style.transform = `${tf} scale(1.02)`;

    box.dataset.filled = "1";
    piece.dataset.snapped = "1";
    piece.dataset.locked = "1";

    // ヒント停止（シルエット側のループも止める）
    clearHintTimer(piece);

    // 効果
    playKachi();
    sparkleSilhouette(box);

    // 動かしていたピースは消す（以後動かない）
    piece.remove();

    // 全部ハマったら：hazimekara.png を中央表示 → タップでリロード
    if (checkAllFilled()){
      document.body.classList.add("is-complete");
      playFinishFanfare();
      showHazimekaraOverlay();
    }

    return true;
  }

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

  function setHandlesVisible(el, visible){
    if (!el) return;
    const hs = el.querySelectorAll(".piece-handle");
    hs.forEach((h) => {
      h.style.display = visible ? "grid" : "none";
      h.style.placeItems = "center";
      h.style.fontSize = "14px";
      h.style.lineHeight = "1";
    });
  }

  function selectPiece(el){
    if (!el) return;
    if (prevActiveEl && prevActiveEl !== el){
      setHandlesVisible(prevActiveEl, false);
    }
    prevActiveEl = el;
    activeEl = el;
    setHandlesVisible(activeEl, true);
  }

  function getClientCenter(el){
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function clearHintTimer(piece){
    if (!piece) return;
    const id = hintTimers.get(piece);
    if (typeof id === "number"){
      window.clearTimeout(id);
    }
    hintTimers.delete(piece);

    const pid = piece.dataset.id || "";
    if (!pid) return;
    const box = stage.querySelector(`.silhouette-box[data-id="${pid}"]`);
    if (!(box instanceof HTMLElement)) return;
    box.classList.remove("is-hint-loop");
  }

    function cancelHintTimerOnly(piece){
    if (!piece) return;
    const id = hintTimers.get(piece);
    if (typeof id === "number"){
      window.clearTimeout(id);
    }
    hintTimers.delete(piece);
  }

  function flashSilhouetteHint(id){
    if (!id) return;
    const box = stage.querySelector(`.silhouette-box[data-id="${id}"]`);
    if (!(box instanceof HTMLElement)) return;
    if (box.dataset.filled === "1") return;

    // 四角枠の一瞬ヒントは廃止：連続“なぞり光”に統一
    box.classList.add("is-hint-loop");
  }

  function scheduleHint(piece){
    if (!piece) return;
    if (piece.dataset.snapped === "1") return;
    if (piece.dataset.locked === "1") return;

    const pid = piece.dataset.id || "";
    if (pid){
      const box0 = stage.querySelector(`.silhouette-box[data-id="${pid}"]`);
      // すでにラダーが出ているなら、タイマーも表示も触らない（止めない）
      if (box0 instanceof HTMLElement && box0.classList.contains("is-hint-loop")){
        return;
      }
    }

    // タイマーだけを更新（表示は消さない）
    cancelHintTimerOnly(piece);

    const tid = window.setTimeout(() => {
      if (!stage) return;
      if (!document.body.contains(piece)) return;
      if (piece.dataset.snapped === "1") return;
      if (piece.dataset.locked === "1") return;

      const id = piece.dataset.id || "";
      flashSilhouetteHint(id); // ここで is-hint-loop を付与
    }, 2200);

    hintTimers.set(piece, tid);
  }

  function sparklePiece(piece){
    if (!piece) return;
    piece.classList.remove("is-correct");
    void piece.offsetWidth;
    piece.classList.add("is-correct");
    window.setTimeout(() => piece.classList.remove("is-correct"), 700);
  }

  function sparkleSilhouette(box){
    if (!box) return;
    box.classList.remove("is-correct");
    void box.offsetWidth;
    box.classList.add("is-correct");
    window.setTimeout(() => box.classList.remove("is-correct"), 700);
  }

  // duplicate trySnap removed (keep the earlier trySnap that includes color-swap / hint-loop handling)

  // ===== Drawer Drag & Drop =====
  window.startDragFromDrawer = function(e, id){
    draggingId = id;

    // ghost element
    if (dragGhost) dragGhost.remove();
    dragGhost = document.createElement("img");
    dragGhost.src = `/assets/img/cobake/monokuro/monokuro/${id}.png`;
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

      // iOSで clientX/clientY が不正になる環境があるため防御
      const cx = Number(ev.clientX);
      const cy = Number(ev.clientY);

      const inside =
        Number.isFinite(cx) && Number.isFinite(cy) &&
        (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom);

      if (inside){
        // stage 内座標を直接算出し、必ず clamp（左上0固定事故を防ぐ）
        let x = cx - r.left;
        let y = cy - r.top;

        if (!Number.isFinite(x)) x = r.width * 0.5;
        if (!Number.isFinite(y)) y = r.height * 0.5;

        x = Math.max(0, Math.min(r.width,  x));
        y = Math.max(0, Math.min(r.height, y));

        const el = createPiece(draggingId, x, y);
        if (el){
          el.dataset.snapped = "0";
          selectPiece(el);
          scheduleHint(el);
        }
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

    const piece = t.closest ? t.closest(".piece") : null;
    if (!(piece instanceof HTMLElement)) return;

    if (piece.dataset.locked === "1") return;

    clearHintTimer(piece);

    e.preventDefault();
    e.stopPropagation();
    piece.remove();
  });

  stage.addEventListener("pointerdown", (e) => {
    const t = e.target;

    const handleEl =
      (t instanceof HTMLElement) &&
      t.closest &&
      t.closest(".piece-handle");

    const pieceEl =
      (t instanceof HTMLElement) &&
      t.closest &&
      t.closest(".piece");

    const hitHandle = handleEl instanceof HTMLElement;
    const hitPiece = pieceEl instanceof HTMLElement;

    // ロック中の activeEl は操作させない
    if (activeEl && activeEl.dataset.locked === "1") return;

    // 1本目：piece or handle のみ開始
    // 2本目以降：activeEl があれば stage 上でも拾う（画像外に指が出てもピンチ/回転成立）
    if (!hitPiece && !hitHandle && !activeEl) return;

    // ロック済み piece は一切触れない
    if (hitPiece && pieceEl.dataset.locked === "1") return;

    e.preventDefault();
    e.stopPropagation();

    if (hitPiece){
      selectPiece(pieceEl);
      if (activeEl && activeEl.dataset.snapped !== "1"){
        scheduleHint(activeEl);
      }
    }

    // mode 決定（handle優先）
    mode = "move";
    if (hitHandle){
      const kind = handleEl.getAttribute("data-handle") || "";
      if (kind === "rotate") mode = "rotate";
      if (kind === "scale")  mode = "scale";
    }

    // capture
    if (activeEl && activeEl.setPointerCapture){
      activeEl.setPointerCapture(e.pointerId);
    }

    // piece をタップしたときのみ、ダブルタップ判定・ドラッグ基準を更新
    // （handle 操作では削除判定しない）
    if (hitPiece && !hitHandle){
      const now = Date.now();
      const prev = lastTap.get(activeEl);
      if (prev && (now - prev.t) < 320){
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        if ((dx*dx + dy*dy) < (18*18)){
          clearHintTimer(activeEl);
          activeEl.remove();
          lastTap.delete(activeEl);
          activeEl = null;
          pts.clear();
          return;
        }
      }
      lastTap.set(activeEl, { t: now, x: e.clientX, y: e.clientY });

      const p = localXY(e.clientX, e.clientY);
      const curLeft = Number.parseFloat(activeEl.style.left) || p.x;
      const curTop  = Number.parseFloat(activeEl.style.top)  || p.y;
      dragOffset = { dx: curLeft - p.x, dy: curTop - p.y };
    }

    // 1 pointer handle baseline
    if (activeEl && (mode === "rotate" || mode === "scale")){
      center0 = getClientCenter(activeEl);
      oneStartAng = angle(center0, { x: e.clientX, y: e.clientY });
      oneStartDist = dist(center0, { x: e.clientX, y: e.clientY });
      startScale = getScale(activeEl);
      startRot = getRot(activeEl);
    }

    // register pointer
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // prepare pinch/rotate baseline if 2 pointers
    if (activeEl && pts.size === 2){
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

    // 2 pointers => pinch/rotate（iPhone/iPad優先）
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

    // 1 pointer => handle rotate/scale (PC)
    if (mode === "rotate"){
      const angNow = angle(center0, { x: e.clientX, y: e.clientY });
      const delta = (angNow - oneStartAng) * 180 / Math.PI;
      const nextRot = startRot + delta;

      activeEl.dataset.rot = String(nextRot);
      applyTransform(activeEl);
      return;
    }

    if (mode === "scale"){
      const dNow = dist(center0, { x: e.clientX, y: e.clientY });
      if (oneStartDist > 0){
        const nextScale = Math.max(0.2, Math.min(6, startScale * (dNow / oneStartDist)));
        activeEl.dataset.scale = String(nextScale);
        applyTransform(activeEl);
      }
      return;
    }

    // 1 pointer => move (+ magnet preview + hint decay)
    const p = localXY(e.clientX, e.clientY);
    let nx = p.x + dragOffset.dx;
    let ny = p.y + dragOffset.dy;

    if (activeEl.dataset.snapped !== "1" && activeEl.dataset.locked !== "1"){
      const id = activeEl.dataset.id || "";
      if (id){
        const box = stage.querySelector(`.silhouette-box[data-id="${id}"]`);
        if (box instanceof HTMLElement && box.dataset.filled !== "1"){
          const br = box.getBoundingClientRect();
          const sr = stageRect();

          const boxCx = (br.left - sr.left) + br.width / 2;
          const boxCy = (br.top - sr.top) + br.height / 2;

          const dx = boxCx - nx;
          const dy = boxCy - ny;
          const dd = Math.hypot(dx, dy);

          const thr = Math.max(16, Math.min(52, Math.min(br.width, br.height) * 0.19));
          const magR = thr * 1.6;

          // hint: 一度出たら「ハマるか消すまで」止めない（距離で外さない）
          // ※停止は clearHintTimer(piece) でのみ行う

          // magnet preview: near correct silhouette, pull 1-2px toward center
          if (dd > 0.001 && dd < magR){
            const t = 1 - (dd / magR);          // 0..1
            const pull = Math.min(2, 2 * t);    // 0..2px
            nx += (dx / dd) * pull;
            ny += (dy / dd) * pull;
          }
        }
      }
    }

    activeEl.style.left = `${nx}px`;
    activeEl.style.top  = `${ny}px`;
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
      if (activeEl && activeEl.dataset.snapped !== "1"){
        trySnap(activeEl);
      }
      mode = "move";
      activeEl = null;
    }
  }

  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // stage クリックで選択解除（ハンドル非表示）
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const hit = t.closest && t.closest(".piece");
    if (hit) return;

    if (prevActiveEl){
      setHandlesVisible(prevActiveEl, false);
    }
    prevActiveEl = null;
    activeEl = null;
  });
})();

// =========================
// Boot
// =========================
function syncStageSize(){
  if (!stage) return;

  // 非表示時（display:none）は rect が 0 になるため、0px 固定事故を防ぐ
  stage.style.width = "";
  stage.style.height = "";

  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return;

  stage.style.width  = `${r.width}px`;
  stage.style.height = `${r.height}px`;
}

// iOS Safari / 回転 / アドレスバー変動 対策
window.addEventListener("resize", () => {
  window.requestAnimationFrame(syncStageSize);
});

window.addEventListener("orientationchange", () => {
  window.setTimeout(syncStageSize, 50);
});

// 初期同期
syncStageSize();

// 画面が緑一色になる事故防止：どちらも非アクティブならSTARTへ強制復帰
if (screenStart && screenGame){
  const sOn = screenStart.classList.contains("is-active");
  const gOn = screenGame.classList.contains("is-active");
  if (!sOn && !gOn){
    screenStart.classList.add("is-active");
    screenGame.classList.remove("is-active");
  }
}

buildCobakeList();
startSequence();


