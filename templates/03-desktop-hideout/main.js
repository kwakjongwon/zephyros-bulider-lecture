/* ==========================================================================
   HIDEOUT.FM — 작은 작업실 · main.js
   라이브러리 없이 동작합니다. 실제 이미지·음원은 ASSETS에 경로만 넣으면 교체돼요.
   ========================================================================== */

// ── ASSETS ─────────────────────────────────────────────────────────────────
// 값이 null/빈 객체면 코드로 그린 도트 그림과 데모 재생(진행 막대·이퀄라이저만 움직임)을 씁니다.
const ASSETS = {
  // 16×16 칸을 가로 한 줄로 이어 붙인 PNG 스프라이트 시트. 예: 'assets/sprites.png'
  spriteSheet: null,
  spriteCell: 16,
  // 시트 안의 칸 순서 (왼쪽부터). 시계 칸은 바늘 없는 얼굴만 그려 두면 바늘은 코드가 현재 시각으로 그립니다.
  spriteOrder: ['folder', 'speaker', 'speakerOn', 'speakerOn2', 'clock', 'letter', 'cat', 'catBlink', 'catHappy'],
  // 곡 id → 음원 파일. 예: { 'dawn-1': 'assets/audio/dawn-1.mp3' }
  tracks: {},
};

// ── DATA ───────────────────────────────────────────────────────────────────
// 곡 제목·아티스트는 모두 예시입니다. [id, 제목, 아티스트, 길이(초)]
const CHANNELS = [
  {
    id: 'dawn', no: '01', name: '새벽 작업', mood: '가사 없는 로파이',
    desc: '키보드 소리와 잘 섞이도록 가사 없는 곡만 골랐어요. 갑자기 커지는 구간이 없습니다.',
    tracks: [
      ['dawn-1', '형광등 아래서', '느린우편', 232],
      ['dawn-2', '커서가 깜빡일 때', '새벽세탁소', 250],
      ['dawn-3', '저장하지 않은 파일', '온실 사운드', 207],
      ['dawn-4', '02:40 AM', '물결 테이프', 285],
      ['dawn-5', '식은 보리차', '느린우편', 198],
      ['dawn-6', '마지막 저장', '새벽세탁소', 302],
    ],
  },
  {
    id: 'rain', no: '02', name: '비 오는 오후', mood: '빗소리와 피아노',
    desc: '작업실 창가에서 녹음한 빗소리를 낮게 깔고 피아노를 얹었어요.',
    tracks: [
      ['rain-1', '우산 세 개', '오후세시 피아노', 224],
      ['rain-2', '젖은 운동화', '처마밑 트리오', 241],
      ['rain-3', '창문 반만 열고', '오후세시 피아노', 263],
      ['rain-4', '버스 정류장 처마', '처마밑 트리오', 219],
      ['rain-5', '비 갠 다음', '오후세시 피아노', 276],
    ],
  },
  {
    id: 'walk', no: '03', name: '산책', mood: '느린 기타 연주',
    desc: '걸음 속도에 맞춘 곡들이에요. 퇴근길이나 점심 산책에 틀어 두세요.',
    tracks: [
      ['walk-1', '골목 끝 빵집', '골목 산책회', 198],
      ['walk-2', '신호등 세 번', '보통의 리듬', 211],
      ['walk-3', '강변 자전거', '골목 산책회', 236],
      ['walk-4', '해 질 녘 벤치', '보통의 리듬', 254],
      ['walk-5', '집으로 가는 길', '골목 산책회', 229],
    ],
  },
  {
    id: 'focus', no: '04', name: '집중 50분', mood: '긴 호흡의 곡',
    desc: '50분 동안 흐름이 끊기지 않도록 길게 이어 붙였어요. 포모도로 타이머와 길이가 같아요.',
    tracks: [
      ['focus-1', '첫 10분', '한 문단 앙상블', 600],
      ['focus-2', '깊은 물', '한 문단 앙상블', 840],
      ['focus-3', '한 문단 더', '온실 사운드', 780],
      ['focus-4', '종이 울리기 전', '한 문단 앙상블', 780],
    ],
  },
].map(ch => ({ ...ch, tracks: ch.tracks.map(([id, title, artist, dur]) => ({ id, title, artist, dur })) }));

const MASCOT_LINES = [
  '안녕하세요, 작업실 고양이 모모예요.',
  '재생 버튼을 누르면 같이 고개를 흔들게요.',
  '오늘은 ‘비 오는 오후’ 채널 어때요?',
  '방명록에 한 줄 남겨 주면 기뻐요.',
  '50분 집중했다면 10분은 꼭 쉬어요.',
];

// ── HELPERS ────────────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const deskMQ = matchMedia('(min-width: 1024px)');
const isDesk = () => deskMQ.matches;
const clampN = (min, v, max) => Math.min(max, Math.max(min, v));
const pad2 = n => String(n).padStart(2, '0');
const fmtTime = s => `${pad2(Math.floor(s / 60))}:${pad2(Math.floor(s % 60))}`;

/** 요소 만들기 — 텍스트는 항상 textContent로 넣어요 (사용자 입력 포함). */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}

const store = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
};

// ── SPRITES ────────────────────────────────────────────────────────────────
// 16×16 논리 픽셀. 문자 하나 = 픽셀 하나.
//   k = --text (1px 외곽선)   w = --surface (밝은 면)   g = --tint (오른쪽·아래 명암)
//   b = --accent (포인트)     . = 투명
// 규칙: 외곽선은 항상 k 1px, 빛은 왼쪽 위에서, 명암은 오른쪽·아래 안쪽 한 줄만 g.
const SPRITES = {
  folder: [
    '................',
    '.kkkkk..........',
    'kbbbbbk.........',
    'kbbbbbbkkkkkkkk.',
    'kbbkkkkkkkkkkbk.',
    'kbbkwwwwwwwwkbk.',
    'kbbkwgggggwwkbk.',
    'kbbkwggggwwwkbk.',
    'kkkkkkkkkkkkkkk.',
    'kwwwwwwwwwwwwgk.',
    'kwbbbbwwwwwwwgk.',
    'kwwwwwwwwwwwwgk.',
    'kwwwwwwwwwwwwgk.',
    'kgggggggggggggk.',
    'kkkkkkkkkkkkkkk.',
    '................',
  ],
  speaker: [
    '................',
    '...kkkkkkkkkk...',
    '...kwwwwwwwgk...',
    '...kwwwkkwwgk...',
    '...kwwkbbkwgk...',
    '...kwwwkkwwgk...',
    '...kwwwwwwwgk...',
    '...kwwkkkkwgk...',
    '...kwkbbbbkgk...',
    '...kwkbkkbkgk...',
    '...kwkbkkbkgk...',
    '...kwkbbbbkgk...',
    '...kwwkkkkwgk...',
    '...kggggggggk...',
    '...kkkkkkkkkk...',
    '....kk....kk....',
  ],
  speakerOn: [
    '................',
    '...kkkkkkkkkk...',
    '...kwwwwwwwgk...',
    '...kwwwkkwwgk...',
    '...kwwkbbkwgk...',
    '...kwwwkkwwgk...',
    '.b.kwwwwwwwgk.b.',
    'b..kwwkkkkwgk..b',
    'b..kwkbbbbkgk..b',
    'b.bkwkbkkbkgkb.b',
    'b.bkwkbkkbkgkb.b',
    'b..kwkbbbbkgk..b',
    'b..kwwkkkkwgk..b',
    '.b.kggggggggk.b.',
    '...kkkkkkkkkk...',
    '....kk....kk....',
  ],
  speakerOn2: [
    '................',
    '...kkkkkkkkkk...',
    '...kwwwwwwwgk...',
    '...kwwwkkwwgk...',
    '...kwwkbbkwgk...',
    '...kwwwkkwwgk...',
    '...kwwwwwwwgk...',
    '...kwwkkkkwgk...',
    '...kwkbbbbkgk...',
    '..bkwkbkkbkgkb..',
    '..bkwkbkkbkgkb..',
    '...kwkbbbbkgk...',
    '...kwwkkkkwgk...',
    '...kggggggggk...',
    '...kkkkkkkkkk...',
    '....kk....kk....',
  ],
  clock: [
    '................',
    '......kkkkk.....',
    '.....kwwwwwk....',
    '....kwwwkwwwk...',
    '...kwwwwwwwwwk..',
    '..kwwwwwwwwwwgk.',
    '..kwwwwwwwwwwgk.',
    '..kwkwwwwwwwkgk.',
    '..kwwwwwwwwwwgk.',
    '..kwwwwwwwwwwgk.',
    '...kgwwwwwwwgk..',
    '....kgwwkwwgk...',
    '.....kgggggk....',
    '......kkkkk.....',
    '.....kk...kk....',
    '................',
  ],
  letter: [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kkwwwwwwwwwwkk.',
    '.kwkwwwwwwwwkwk.',
    '.kwwkwwwwwwkwwk.',
    '.kwwwkwwwwkwwwk.',
    '.kwwwwkbbkwwwwk.',
    '.kwwwwwkkwwwwwk.',
    '.kwwwwwwwwwwwgk.',
    '.kwwwwwwwwwwwgk.',
    '.kggggggggggggk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  cat: [
    '................',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '.kbkk......kkbk.',
    '.kbkgk....kgkbk.',
    'kbbkwwkkkkwwkbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwkwwwwkwwbbk',
    'kbbwwkwwwwkwwbbk',
    '.kkwwwwkkwwwwkk.',
    '..kwwwwwwwwwwgk.',
    '...kkwwwwwwkkk.k',
    '...kwwkwwkwwgk.k',
    '...kwwkwwkwwgkk.',
    '...kkkkkkkkkkk..',
    '....gggggggggg..',
  ],
  catBlink: [
    '................',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '.kbkk......kkbk.',
    '.kbkgk....kgkbk.',
    'kbbkwwkkkkwwkbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwkwwwwkwwbbk',
    '.kkwwwwkkwwwwkk.',
    '..kwwwwwwwwwwgk.',
    '...kkwwwwwwkkk.k',
    '...kwwkwwkwwgk.k',
    '...kwwkwwkwwgkk.',
    '...kkkkkkkkkkk..',
    '....gggggggggg..',
  ],
  catHappy: [
    '................',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '.kbkk......kkbk.',
    '.kbkgk....kgkbk.',
    'kbbkwwkkkkwwkbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwkwwwwkwwbbk',
    'kbbwkwkwwkwkwbbk',
    '.kkwwwwkkwwwwkk.',
    '..kwwwwwwwwwwgk.',
    '...kkwwwwwwkkk.k',
    '...kwwkwwkwwgk.k',
    '...kwwkwwkwwgkk.',
    '...kkkkkkkkkkk..',
    '....gggggggggg..',
  ],
};

let palette = null;
let sheet = null;

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = name => cs.getPropertyValue(name).trim();
  palette = { k: v('--text'), w: v('--surface'), g: v('--tint'), b: v('--accent') };
}

// 시계 바늘: 8방향, 중심 (8,7). 분침은 강조색, 시침은 외곽선색.
const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
function drawClockHands(ctx, date) {
  const cx = 8, cy = 7;
  const m = date.getMinutes(), hr = date.getHours() % 12;
  const minuteDir = Math.round(m / 7.5) % 8;
  const hourDir = Math.round((hr + m / 60) / 1.5) % 8;
  const hand = (dir, straight, diag, color) => {
    const [dx, dy] = DIRS[dir];
    const len = dx && dy ? diag : straight;
    ctx.fillStyle = color;
    for (let i = 1; i <= len; i++) ctx.fillRect(cx + dx * i, cy + dy * i, 1, 1);
  };
  hand(hourDir, 3, 2, palette.k);
  hand(minuteDir, 4, 3, palette.b);
  ctx.fillStyle = palette.k;
  ctx.fillRect(cx, cy, 1, 1);
}

/** 캔버스(16×16)에 스프라이트를 그려요. 시트가 있으면 시트 칸을, 없으면 문자 지도를 씁니다. */
function drawSprite(canvas, name) {
  const size = ASSETS.spriteCell;
  if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  const index = ASSETS.spriteOrder.indexOf(name);
  if (sheet && index >= 0) {
    ctx.drawImage(sheet, index * size, 0, size, size, 0, 0, size, size);
  } else {
    (SPRITES[name] || []).forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
      }
    });
  }
  if (name === 'clock') drawClockHands(ctx, new Date());
  canvas.dataset.frame = name;
}

const spriteCanvases = () => $$('[data-sprite]').map(el => ({
  canvas: el.tagName === 'CANVAS' ? el : $('canvas', el),
  name: el.dataset.sprite,
}));

function drawAllSprites() {
  for (const { canvas, name } of spriteCanvases()) drawSprite(canvas, canvas.dataset.frame || name);
}

function loadSpriteSheet() {
  if (!ASSETS.spriteSheet) return;
  const img = new Image();
  img.onload = () => { sheet = img; drawAllSprites(); };
  img.src = ASSETS.spriteSheet;
}
// ── /SPRITES ───────────────────────────────────────────────────────────────

// ── DOT EQUALIZER ──────────────────────────────────────────────────────────
class DotEQ {
  constructor(canvas, { cols, rows, dot, gap }) {
    Object.assign(this, { canvas, cols, rows, dot, gap });
    this.ctx = canvas.getContext('2d');
    this.resize();
  }
  resize() {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const w = this.cols * this.dot + (this.cols - 1) * this.gap;
    const hgt = this.rows * this.dot + (this.rows - 1) * this.gap;
    this.dpr = dpr;
    this.canvas.width = w * dpr;
    this.canvas.height = hgt * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${hgt}px`;
  }
  /** levels: 0..1 값 배열 (길이 상관없음) */
  draw(levels) {
    const { ctx, cols, rows, dot, gap, dpr } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let c = 0; c < cols; c++) {
      const v = levels[Math.floor((c / cols) * levels.length)] || 0;
      const lit = Math.round(v * rows);
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = rows - r <= lit ? palette.b : palette.g;
        ctx.fillRect(c * (dot + gap) * dpr, r * (dot + gap) * dpr, dot * dpr, dot * dpr);
      }
    }
  }
}

const EQ_SPECS = {
  big: { cols: 12, rows: 8, dot: 4, gap: 2 },
  mini: { cols: 5, rows: 4, dot: 4, gap: 2 },
  tiny: { cols: 4, rows: 3, dot: 2, gap: 1 },
};
const STATIC_LEVELS = [0.5, 0.75, 0.62, 0.88, 0.5, 0.62, 0.38, 0.5, 0.75, 0.38, 0.25, 0.38];
const eqs = [];
const eqState = { levels: new Array(12).fill(0), raf: 0, last: 0, beat: 0 };

function eqStep() {
  // 낮은 음역이 조금 더 크게, 박자마다 한 번씩 튀어 오르고 천천히 떨어지는 움직임
  eqState.beat = (eqState.beat + 1) % 4;
  eqState.levels = eqState.levels.map((v, i) => {
    const base = 0.75 - i * 0.035;
    const kick = eqState.beat === 0 && i < 4 ? 0.3 : 0;
    const target = clampN(0.12, base * (0.35 + Math.random() * 0.65) + kick, 1);
    return target > v ? target : Math.max(target, v - 0.14);
  });
}

function eqDraw(levels) { for (const eq of eqs) eq.draw(levels); }

function eqLoop(now) {
  eqState.raf = requestAnimationFrame(eqLoop);
  if (now - eqState.last < 110) return;
  eqState.last = now;
  eqStep();
  eqDraw(eqState.levels);
}

function eqSync() {
  cancelAnimationFrame(eqState.raf);
  eqState.raf = 0;
  if (!player.playing) { eqDraw(new Array(12).fill(0)); return; }
  if (reduceMQ.matches || document.hidden) { eqDraw(STATIC_LEVELS); return; }
  eqState.raf = requestAnimationFrame(eqLoop);
}

// ── WINDOW MANAGER ─────────────────────────────────────────────────────────
const desktop = $('#desktop');
const wins = new Map();
let zTop = 20;
let activeId = 'intro';
let currentTab = 'ch';

$$('.win').forEach(el => wins.set(el.dataset.win, { id: el.dataset.win, el, opener: null, moved: false, placed: false, x: 0, y: 0 }));

const winTitle = w => $('.win__title', w.el).textContent.trim();

function setState(w, state) {
  w.el.dataset.state = state;
  const shade = $('.win__shade', w.el);
  if (shade) {
    const expanded = state === 'open';
    shade.setAttribute('aria-expanded', String(expanded));
    shade.setAttribute('aria-label', `${winTitle(w)} 창 ${expanded ? '접기' : '펼치기'}`);
  }
  syncActiveUI();
}

function topOpenWin() {
  let best = null, bestZ = -1;
  wins.forEach(w => {
    if (w.el.dataset.state === 'closed' || w.id === 'player') return;
    const z = Number(w.el.style.zIndex) || 0;
    if (z > bestZ) { best = w; bestZ = z; }
  });
  return best;
}

function syncActiveUI() {
  const active = wins.get(activeId);
  const visible = active && active.el.dataset.state !== 'closed';
  wins.forEach(w => w.el.classList.toggle('is-active', visible && w.id === activeId));
  $$('.menu a').forEach(a => a.classList.toggle('is-active', visible && a.dataset.open === activeId));
  $$('.icon').forEach(btn => {
    const match = btn.dataset.open === activeId && (!btn.dataset.tab || btn.dataset.tab === currentTab);
    btn.classList.toggle('is-active', Boolean(visible && match));
  });
}

function front(w) {
  if (isDesk()) w.el.style.zIndex = String(++zTop);
  activeId = w.id;
  syncActiveUI();
}

function openWin(id, { opener = null, focus = true } = {}) {
  const w = wins.get(id);
  if (!w) return;
  const wasHidden = w.el.dataset.state !== 'open';
  if (opener) w.opener = opener;
  setState(w, 'open');
  front(w);
  if (isDesk()) {
    if (!w.placed) placeWin(w);
    else keepInside(w);
    if (wasHidden && !reduceMQ.matches) {
      w.el.classList.remove('is-opening');
      void w.el.offsetWidth;
      w.el.classList.add('is-opening');
    }
    if (focus) w.el.focus({ preventScroll: true });
  } else if (focus) {
    w.el.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'start' });
    w.el.focus({ preventScroll: true });
  }
}

function isShown(el) { return el && el.isConnected && el.getClientRects().length > 0; }

function closeWin(id) {
  const w = wins.get(id);
  if (!w || id === 'player') return;
  if (!isDesk()) { setState(w, 'closed'); $('.win__shade', w.el)?.focus(); return; }
  setState(w, 'closed');
  if (activeId === id) {
    const next = topOpenWin();
    activeId = next ? next.id : '';
    syncActiveUI();
  }
  const back = isShown(w.opener) ? w.opener : $(`.menu a[data-open="${id}"]`);
  back?.focus({ preventScroll: true });
}

function toggleShade(w) {
  const open = w.el.dataset.state === 'open';
  if (isDesk()) {
    setState(w, open ? 'shaded' : 'open');
    front(w);
    keepInside(w);
  } else {
    setState(w, open ? 'closed' : 'open');
    if (!open) front(w);
  }
}

// 데스크톱 배치 ------------------------------------------------------------
const ICON_COL = 120;
const EDGE = 24;
let geom = null;

function computeGeom() {
  const W = desktop.clientWidth, H = desktop.clientHeight;
  const gap = clampN(24, Math.round(W * 0.03), 48);
  let iw = clampN(380, Math.round(W * 0.36), 540);
  let pw = clampN(420, Math.round(W * 0.38), 580);
  const avail = W - ICON_COL - EDGE;
  const total = iw + gap + pw;
  if (total > avail) { const k = avail / total; iw = Math.floor(iw * k); pw = Math.floor(pw * k); }
  const x0 = ICON_COL + Math.max(0, Math.round((avail - (iw + gap + pw)) / 2));
  geom = { W, H, gap, iw, pw, x0 };
  return geom;
}

function setBox(w, { x, y, width, maxH }) {
  const s = w.el.style;
  if (width != null) s.width = `${width}px`;
  if (maxH != null) s.maxHeight = `${Math.max(160, maxH)}px`;
  s.bottom = 'auto';
  w.x = Math.round(x); w.y = Math.round(y);
  s.left = `${w.x}px`; s.top = `${w.y}px`;
  w.placed = true;
}

function naturalHeight(w) {
  const prev = w.el.style.maxHeight;
  w.el.style.maxHeight = 'none';
  const hgt = w.el.offsetHeight;
  w.el.style.maxHeight = prev;
  return hgt;
}

/** 처음 세 창(소개·기록·플레이어)을 화면 크기에 맞게 배치합니다. 사용자가 옮긴 창은 건드리지 않아요. */
function layoutDesk() {
  if (!isDesk()) return;
  const { W, H, gap, iw, pw, x0 } = computeGeom();
  const intro = wins.get('intro'), posts = wins.get('posts'), pl = wins.get('player');
  const gapV = 24;

  // 플레이어는 소개 창과 같은 너비의 납작한 창. 높이를 먼저 재요.
  if (!pl.moved) pl.el.style.width = `${iw}px`;
  if (!intro.moved) intro.el.style.width = `${iw}px`;
  const plH = pl.el.offsetHeight || 150;
  const introH = intro.el.dataset.state === 'closed' ? 0 : naturalHeight(intro);
  const stack = introH + gapV + plH;
  const fits = stack + 16 + EDGE <= H;
  // 남는 세로 공간의 1/3만큼 내려서 화면 가운데쯤에 모아요.
  const top = fits ? clampN(16, Math.round((H - stack) / 3), 96) : 24;
  geom.top = top;
  geom.playerLeft = fits;

  if (!intro.moved) setBox(intro, { x: x0, y: top, width: iw, maxH: H - top - EDGE });
  if (!posts.moved) setBox(posts, { x: x0 + iw + gap, y: top + 32, width: pw, maxH: H - top - 32 - EDGE });
  if (!pl.moved) {
    if (fits) {
      setBox(pl, { x: x0, y: top + introH + gapV, width: iw });
    } else {
      // 세로 공간이 모자라면 플레이어를 기록 창 아래로 보내고 기록 창 높이를 줄여요.
      pl.el.style.width = `${pw}px`;
      const y = H - pl.el.offsetHeight - EDGE;
      setBox(pl, { x: x0 + iw + gap, y, width: pw });
      if (!posts.moved) posts.el.style.maxHeight = `${Math.max(240, y - gapV - (top + 32))}px`;
    }
  }
  wins.forEach(w => { if (w.placed) keepInside(w); });
}

function placeWin(w) {
  const g = geom || computeGeom();
  const rightX = g.x0 + g.iw + g.gap;          // 기록 창이 있는 오른쪽 열
  const rightW = g.W - rightX - EDGE;
  const top = g.top ?? 32;
  if (w.id === 'music') {
    // 플레이어를 가리지 않도록 오른쪽 열에 우선 열어요.
    const roomy = g.playerLeft && rightW >= 540;
    const width = roomy ? Math.min(720, rightW) : Math.min(clampN(600, Math.round(g.W * 0.5), 720), g.W - 2 * EDGE);
    const x = roomy ? rightX : clampN(EDGE, g.x0 + 40, g.W - width - EDGE);
    setBox(w, { x, y: Math.max(16, top - 8), width, maxH: g.H - Math.max(16, top - 8) - EDGE });
  } else if (w.id === 'guest') {
    const width = Math.min(clampN(420, Math.round(g.W * 0.34), 500), g.W - 2 * EDGE);
    const x = clampN(EDGE, rightX + 32, g.W - width - EDGE);
    setBox(w, { x, y: top + 56, width, maxH: g.H - top - 56 - EDGE });
  } else {
    layoutDesk();
  }
  keepInside(w);
}

function moveTo(w, x, y) {
  const W = desktop.clientWidth, H = desktop.clientHeight;
  const ww = w.el.offsetWidth, wh = w.el.offsetHeight;
  w.x = Math.round(clampN(0, x, Math.max(0, W - ww - 6)));
  w.y = Math.round(clampN(0, y, Math.max(0, H - wh - 6)));
  w.el.style.left = `${w.x}px`;
  w.el.style.top = `${w.y}px`;
}
const keepInside = w => { if (isDesk() && w.placed) moveTo(w, w.x, w.y); };

function initDrag(w) {
  const bar = $('.win__bar', w.el);
  let start = null;
  bar.addEventListener('pointerdown', e => {
    if (!isDesk() || e.button !== 0 || e.target.closest('button')) return;
    front(w);
    start = { px: e.clientX, py: e.clientY, x: w.x, y: w.y };
    bar.setPointerCapture(e.pointerId);
    w.el.classList.add('is-dragging');
    e.preventDefault();
  });
  bar.addEventListener('pointermove', e => {
    if (!start) return;
    w.moved = true;
    moveTo(w, start.x + e.clientX - start.px, start.y + e.clientY - start.py);
  });
  const end = e => {
    if (!start) return;
    start = null;
    w.el.classList.remove('is-dragging');
    if (bar.hasPointerCapture?.(e.pointerId)) bar.releasePointerCapture(e.pointerId);
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', e => { if (isDesk() && !e.target.closest('button')) toggleShade(w); });
}

const mascotEl = $('#mascot');

function applyMode() {
  const desk = isDesk();
  wins.forEach(w => {
    if (w.id !== 'player') w.el.setAttribute('role', desk ? 'dialog' : 'region');
    if (!desk) {
      ['left', 'top', 'bottom', 'width', 'maxHeight', 'zIndex'].forEach(p => { w.el.style[p] = ''; });
      w.placed = false;
      w.moved = false;
    }
  });
  if (desk) {
    if (mascotEl.parentElement !== desktop) desktop.append(mascotEl);
    // 데스크톱에서 '접힘'으로 남은 창은 그대로, 모바일에서 펼친 창은 열린 창으로 보여요.
    layoutDesk();
    wins.forEach(w => { if (w.el.dataset.state === 'open' && !w.placed) placeWin(w); });
  } else {
    const introWin = wins.get('intro').el;
    if (mascotEl.parentElement !== introWin) introWin.append(mascotEl);
  }
  syncActiveUI();
}

function initWindows() {
  wins.forEach(w => {
    initDrag(w);
    w.el.addEventListener('pointerdown', () => { if (isDesk() && activeId !== w.id) front(w); });
    w.el.addEventListener('focusin', () => { if (activeId !== w.id) front(w); });
    w.el.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') { closeWin(w.id); return; }
      if (action === 'shade') { toggleShade(w); return; }
      // 모바일: 접힌 창의 제목 줄이나 요약을 눌러도 펼쳐져요.
      if (!isDesk() && w.el.dataset.state !== 'open' && !e.target.closest('a, button, input, textarea')) {
        setState(w, 'open');
        front(w);
      }
    });
  });

  // 메뉴 · 아이콘 · 본문 속 바로가기
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-open]');
    if (!trigger) return;
    e.preventDefault();
    if (trigger.dataset.tab) selectTab(trigger.dataset.tab);
    openWin(trigger.dataset.open, { opener: trigger });
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (mascotSay.textContent) hush();
    const winEl = document.activeElement?.closest?.('.win');
    if (!winEl || winEl.dataset.win === 'player') return;
    e.preventDefault();
    closeWin(winEl.dataset.win);
  });

  applyMode();
  deskMQ.addEventListener('change', applyMode);

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      if (!isDesk()) return;
      layoutDesk();
      wins.forEach(w => { if (w.placed && w.el.dataset.state !== 'closed') keepInside(w); });
    });
  });
}

// ── POSTS ──────────────────────────────────────────────────────────────────
function initPosts() {
  const root = $('.posts');
  const list = $('.posts__list', root);
  const items = $$('.post-item', root);
  const articles = $$('.post', root);
  const nav = $('.post-nav', root);
  const pos = $('[data-post-pos]', root);
  const body = $('#b-posts');
  let cur = -1;

  const show = (i, { focus = true } = {}) => {
    cur = (i + articles.length) % articles.length;
    list.hidden = true;
    nav.hidden = false;
    articles.forEach((a, j) => { a.hidden = j !== cur; });
    pos.textContent = `${cur + 1} / ${articles.length}`;
    body.scrollTop = 0;
    if (!isDesk()) wins.get('posts').el.scrollIntoView({ block: 'start', behavior: 'auto' });
    if (focus) $('.post__title', articles[cur]).focus({ preventScroll: true });
  };
  const back = () => {
    list.hidden = false;
    nav.hidden = true;
    articles.forEach(a => { a.hidden = true; });
    items[cur]?.focus({ preventScroll: !isDesk() });
  };

  items.forEach((btn, i) => btn.addEventListener('click', () => show(i)));
  $('[data-post-back]', root).addEventListener('click', back);
  $$('[data-post-step]', root).forEach(btn => btn.addEventListener('click', () => show(cur + Number(btn.dataset.postStep), { focus: false })));
}

// ── PLAYER ─────────────────────────────────────────────────────────────────
const player = { ci: 0, ti: 0, t: 0, playing: false, audio: null, timer: 0, last: 0, seeking: false };
const playerWin = $('#win-player');
const ui = {
  no: $('[data-pl-no]'), ch: $('[data-pl-ch]'), title: $('[data-pl-title]'), artist: $('[data-pl-artist]'),
  cur: $('[data-pl-cur]'), dur: $('[data-pl-dur]'), seek: $('[data-pl-seek]'), line: $('[data-pl-line]'),
  toggle: $('[data-pl-toggle]'), demo: $('[data-pl-demo]'), now: $('.now'), nowCh: $('[data-now-ch]'),
  cta: $('[data-cta="listen"]'), ctaLabel: $('[data-cta-label]'),
};

const curTrack = () => CHANNELS[player.ci].tracks[player.ti];
const trackSrc = tr => ASSETS.tracks[tr.id] || null;

function ensureAudio() {
  if (player.audio) return player.audio;
  const a = new Audio();
  a.preload = 'metadata';
  a.addEventListener('timeupdate', () => { player.t = a.currentTime; updateProgress(); });
  a.addEventListener('ended', () => step(1));
  a.addEventListener('error', () => { if (player.playing) startSim(); });
  player.audio = a;
  return a;
}

function stopSim() { clearInterval(player.timer); player.timer = 0; }
function startSim() {
  stopSim();
  player.last = performance.now();
  player.timer = setInterval(() => {
    const now = performance.now();
    player.t += (now - player.last) / 1000;
    player.last = now;
    if (player.t >= curTrack().dur) { step(1); return; }
    updateProgress();
  }, 250);
}

function loadTrack(ci, ti, { autoplay = player.playing } = {}) {
  stopSim();
  player.ci = ci;
  player.ti = ti;
  player.t = 0;
  const src = trackSrc(curTrack());
  if (src) { const a = ensureAudio(); a.src = src; }
  else if (player.audio) { player.audio.pause(); player.audio.removeAttribute('src'); }
  renderPlayer();
  if (autoplay) play(); else { player.playing = false; onPlayState(); }
}

function play() {
  player.playing = true;
  const src = trackSrc(curTrack());
  if (src) {
    const a = ensureAudio();
    a.currentTime = player.t;
    a.play().catch(() => startSim());
  } else {
    startSim();
  }
  onPlayState();
}

function pause() {
  player.playing = false;
  if (player.audio && !player.audio.paused) player.audio.pause();
  stopSim();
  onPlayState();
}

const togglePlay = () => (player.playing ? pause() : play());

function step(dir) {
  const n = CHANNELS[player.ci].tracks.length;
  if (dir < 0 && player.t > 3) { player.t = 0; if (player.audio && trackSrc(curTrack())) player.audio.currentTime = 0; updateProgress(); return; }
  loadTrack(player.ci, (player.ti + dir + n) % n, { autoplay: player.playing });
}

function renderPlayer() {
  const ch = CHANNELS[player.ci];
  const tr = curTrack();
  ui.no.textContent = `CH.${ch.no}`;
  ui.ch.textContent = ch.name;
  ui.nowCh.textContent = ch.name;
  ui.title.textContent = tr.title;
  ui.artist.textContent = tr.artist;
  ui.dur.textContent = fmtTime(tr.dur);
  ui.seek.max = String(tr.dur);
  const simulated = !trackSrc(tr);
  ui.demo.hidden = !simulated;
  $('.player__demo-tag').hidden = !simulated;
  updateProgress();
  renderChannelList();
  renderTracks();
}

function updateProgress() {
  const tr = curTrack();
  const t = Math.min(player.t, tr.dur);
  const pct = `${((t / tr.dur) * 100).toFixed(2)}%`;
  ui.cur.textContent = fmtTime(t);
  if (!player.seeking) ui.seek.value = String(Math.floor(t));
  ui.seek.style.setProperty('--p', pct);
  ui.seek.setAttribute('aria-valuetext', `${Math.floor(t / 60)}분 ${Math.floor(t % 60)}초 / ${Math.floor(tr.dur / 60)}분 ${tr.dur % 60}초`);
  ui.line.style.width = pct;
}

function onPlayState() {
  const on = player.playing;
  playerWin.classList.toggle('is-playing', on);
  ui.toggle.setAttribute('aria-label', on ? '일시정지' : '재생');
  ui.cta.setAttribute('aria-pressed', String(on));
  ui.ctaLabel.textContent = on ? '잠시 멈추기' : '채널 듣기';
  ui.now.hidden = !on;
  mascotEl.classList.toggle('is-bobbing', on && !reduceMQ.matches);
  speakerAnim();
  eqSync();
  renderChannelList();
  renderTracks();
}

function initPlayer() {
  $$('[data-eq]').forEach(c => eqs.push(new DotEQ(c, EQ_SPECS[c.dataset.eq])));
  ui.toggle.addEventListener('click', togglePlay);
  $('[data-pl-prev]').addEventListener('click', () => step(-1));
  $('[data-pl-next]').addEventListener('click', () => step(1));
  ui.cta.addEventListener('click', togglePlay);
  ui.seek.addEventListener('input', () => {
    player.seeking = true;
    player.t = Number(ui.seek.value);
    if (player.audio && trackSrc(curTrack())) player.audio.currentTime = player.t;
    updateProgress();
  });
  ui.seek.addEventListener('change', () => { player.seeking = false; });
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-play-channel]');
    if (!btn) return;
    const ci = CHANNELS.findIndex(c => c.id === btn.dataset.playChannel);
    if (ci >= 0) loadTrack(ci, 0, { autoplay: true });
  });
  loadTrack(0, 0, { autoplay: false });
}

// 음악 아이콘: 재생 중이면 스피커 울림 두 프레임을 번갈아 그려요.
let speakerTimer = 0;
function speakerAnim() {
  clearInterval(speakerTimer);
  const canvas = $('[data-sprite="speaker"] canvas');
  if (!canvas || !palette) return;
  if (!player.playing) { drawSprite(canvas, 'speaker'); return; }
  drawSprite(canvas, 'speakerOn');
  if (reduceMQ.matches || document.hidden) return;
  let alt = false;
  speakerTimer = setInterval(() => { alt = !alt; drawSprite(canvas, alt ? 'speakerOn2' : 'speakerOn'); }, 420);
}

// ── MUSIC & TOOLS ──────────────────────────────────────────────────────────
let viewCh = 0;
const chList = $('[data-ch-list]');
const chTracks = $('[data-chd-tracks]');

function channelMinutes(ch) { return Math.round(ch.tracks.reduce((s, t) => s + t.dur, 0) / 60); }

function renderChannelList() {
  chList.replaceChildren(...CHANNELS.map((ch, i) => {
    const live = player.playing && player.ci === i;
    return h('li', {},
      h('button', { class: 'ch', type: 'button', 'aria-pressed': String(i === viewCh), 'data-ci': i },
        h('span', { class: 'ch__top' },
          h('span', { class: 'ch__no', text: `CH.${ch.no}` }),
          live ? h('span', { class: 'ch__live', text: '재생 중' }) : null),
        h('span', { class: 'ch__name', text: ch.name }),
        h('span', { class: 'ch__meta', text: `${ch.tracks.length}곡 · ${channelMinutes(ch)}분 · ${ch.mood}` }),
      ),
    );
  }));
}

function renderTracks() {
  const ch = CHANNELS[viewCh];
  $('[data-chd-no]').textContent = `CH.${ch.no} · ${ch.tracks.length}곡 · ${channelMinutes(ch)}분`;
  $('[data-chd-name]').textContent = ch.name;
  $('[data-chd-desc]').textContent = ch.desc;
  chTracks.replaceChildren(...ch.tracks.map((tr, i) => {
    const current = player.ci === viewCh && player.ti === i;
    return h('li', {},
      h('button', { class: 'track', type: 'button', 'data-ti': i, 'aria-current': current ? 'true' : null, 'aria-label': `${tr.title}, ${tr.artist}, ${Math.floor(tr.dur / 60)}분 ${tr.dur % 60}초 재생` },
        h('span', { class: 'track__no', text: pad2(i + 1) }),
        h('span', {},
          h('span', { class: 'track__title' }, tr.title, current && player.playing ? h('span', { class: 'track__eq', text: '재생 중' }) : null),
          h('span', { class: 'track__artist', text: tr.artist })),
        h('span', { class: 'track__dur', text: fmtTime(tr.dur) }),
      ),
    );
  }));
}

const tabs = $$('[role="tab"]');
function selectTab(key, { focus = false } = {}) {
  currentTab = key;
  tabs.forEach(t => {
    const on = t.id === `tab-${key}`;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
    if (on && focus) t.focus();
  });
  syncActiveUI();
}

function initMusic() {
  chList.addEventListener('click', e => {
    const btn = e.target.closest('.ch');
    if (!btn) return;
    viewCh = Number(btn.dataset.ci);
    renderChannelList();
    renderTracks();
    $(`.ch[data-ci="${viewCh}"]`)?.focus();
  });
  chTracks.addEventListener('click', e => {
    const btn = e.target.closest('.track');
    if (!btn) return;
    const ti = Number(btn.dataset.ti);
    if (player.ci === viewCh && player.ti === ti) togglePlay();
    else loadTrack(viewCh, ti, { autoplay: true });
    $(`.track[data-ti="${ti}"]`)?.focus();
  });
  $('[data-chd-play]').addEventListener('click', () => loadTrack(viewCh, 0, { autoplay: true }));

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.id.replace('tab-', '')));
    t.addEventListener('keydown', e => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      const next = tabs[(map[e.key] + tabs.length) % tabs.length];
      selectTab(next.id.replace('tab-', ''), { focus: true });
    });
  });
  renderChannelList();
  renderTracks();
}

// 포모도로 ------------------------------------------------------------------
function initPomodoro() {
  const timeEl = $('[data-pomo-time]');
  const dotsEl = $('[data-pomo-dots]');
  const toggleBtn = $('[data-pomo-toggle]');
  const statusEl = $('[data-pomo-status]');
  const musicCheck = $('[data-pomo-music]');
  const segBtns = $$('.seg button');
  const DOTS = 25;
  const dots = Array.from({ length: DOTS }, () => h('i'));
  dotsEl.replaceChildren(...dots);
  const st = { total: 50 * 60, left: 50 * 60, running: false, endAt: 0, timer: 0 };

  const render = () => {
    const s = Math.ceil(st.left);
    timeEl.textContent = fmtTime(s);
    const on = Math.floor((1 - st.left / st.total) * DOTS);
    dots.forEach((d, i) => d.classList.toggle('on', i < on));
    toggleBtn.textContent = st.running ? '일시정지' : st.left < st.total ? '이어서' : '시작';
  };
  const stop = () => { clearInterval(st.timer); st.running = false; };
  const finish = () => {
    stop();
    st.left = 0;
    render();
    const rest = st.total === 10 * 60;
    statusEl.textContent = rest ? '휴식 끝! 다시 집중해 볼까요?' : `${st.total / 60}분 집중 끝! 10분 쉬어 가세요.`;
    talk(rest ? '다시 시작해 볼까요?' : '수고했어요! 잠깐 쉬어요.');
  };
  const tick = () => {
    st.left = Math.max(0, (st.endAt - Date.now()) / 1000);
    if (st.left <= 0) finish(); else render();
  };
  toggleBtn.addEventListener('click', () => {
    if (st.running) { tick(); stop(); render(); return; }
    if (st.left <= 0) st.left = st.total;
    statusEl.textContent = '';
    st.running = true;
    st.endAt = Date.now() + st.left * 1000;
    st.timer = setInterval(tick, 250);
    const focusCi = CHANNELS.findIndex(c => c.id === 'focus');
    if (musicCheck.checked && st.total !== 10 * 60 && !(player.playing && player.ci === focusCi)) loadTrack(focusCi, 0, { autoplay: true });
    render();
  });
  $('[data-pomo-reset]').addEventListener('click', () => { stop(); st.left = st.total; statusEl.textContent = ''; render(); });
  segBtns.forEach(btn => btn.addEventListener('click', () => {
    segBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    stop();
    st.total = Number(btn.dataset.min) * 60;
    st.left = st.total;
    statusEl.textContent = '';
    render();
  }));
  render();
}

// 메모 ----------------------------------------------------------------------
function initMemo() {
  const KEY = 'hideout.memo.v1';
  const area = $('#memo');
  const status = $('[data-memo-status]');
  area.value = store.get(KEY, '') || '';
  let t = 0;
  area.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const ok = store.set(KEY, area.value);
      const d = new Date();
      status.textContent = ok ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}에 저장했어요. 이 브라우저에만 남아요.` : '이 브라우저에서는 저장할 수 없어요.';
    }, 400);
  });
}

// ── GUESTBOOK ──────────────────────────────────────────────────────────────
function initGuestbook() {
  const KEY = 'hideout.guestbook.v1';
  const form = $('[data-gb-form]');
  const list = $('[data-gb-list]');
  const nameIn = $('#gb-name');
  const msgIn = $('#gb-msg');
  const count = $('[data-gb-count]');
  const status = $('[data-gb-status]');
  const totalEl = $('[data-gb-total]');
  const baseTotal = Number(totalEl?.textContent) || 0;

  const valid = e => e && typeof e.name === 'string' && typeof e.msg === 'string' && typeof e.date === 'string';
  let saved = store.get(KEY, []);
  saved = Array.isArray(saved) ? saved.filter(valid).slice(0, 30) : [];

  const entry = (e, isNew) => {
    const d = new Date(e.date);
    const ok = !Number.isNaN(d.getTime());
    return h('li', { class: `gb-entry${isNew ? ' is-new' : ''}` },
      h('p', { class: 'gb-entry__head' },
        h('span', { class: 'gb-entry__name', text: e.name.slice(0, 12) }),
        h('time', { class: 'mono', datetime: ok ? d.toISOString() : null, text: ok ? `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}` : '' })),
      h('p', { class: 'gb-entry__msg', text: e.msg.slice(0, 120) }),
    );
  };
  const renderTotal = () => { if (totalEl) totalEl.textContent = String(baseTotal + saved.length); };

  saved.slice().reverse().forEach(e => list.prepend(entry(e, false)));
  renderTotal();

  const updateCount = () => { count.textContent = `${msgIn.value.length}/120`; };
  msgIn.addEventListener('input', () => { updateCount(); msgIn.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = msgIn.value.trim().replace(/\s+/g, ' ');
    if (msg.length < 2) {
      msgIn.setAttribute('aria-invalid', 'true');
      status.textContent = '남길 말을 두 글자 이상 적어 주세요.';
      msgIn.focus();
      return;
    }
    const item = { name: nameIn.value.trim() || '익명의 손님', msg, date: new Date().toISOString() };
    saved = [item, ...saved].slice(0, 30);
    const ok = store.set(KEY, saved);
    list.prepend(entry(item, true));
    renderTotal();
    form.reset();
    updateCount();
    status.textContent = ok ? '남겨 주셔서 고마워요! 이 브라우저에 저장했어요.' : '화면에는 남겼지만, 이 브라우저에서는 저장할 수 없어요.';
    talk('방명록 고마워요!');
  });
  updateCount();
}

// ── MASCOT ─────────────────────────────────────────────────────────────────
const mascotBtn = $('.mascot__btn');
const mascotCanvas = $('canvas', mascotBtn);
const mascotSay = $('#mascot-say');
let mascotVisible = true;
let blinkTimer = 0, sayTimer = 0, lineIdx = 0;

function setFrame(name) { if (palette) drawSprite(mascotCanvas, name); }

function scheduleBlink() {
  clearTimeout(blinkTimer);
  if (reduceMQ.matches) return;
  blinkTimer = setTimeout(() => {
    if (!document.hidden && mascotVisible && mascotCanvas.dataset.frame === 'cat') {
      setFrame('catBlink');
      setTimeout(() => { if (mascotCanvas.dataset.frame === 'catBlink') setFrame('cat'); }, 150);
    }
    scheduleBlink();
  }, 2400 + Math.random() * 2600);
}

function talk(text) {
  mascotSay.textContent = text;
  mascotEl.classList.add('is-talking');
  setFrame('catHappy');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(hush, 4500);
}
function hush() {
  mascotSay.textContent = '';
  mascotEl.classList.remove('is-talking');
  if (mascotCanvas.dataset.frame === 'catHappy') setFrame('cat');
}

function initMascot() {
  mascotBtn.addEventListener('click', () => {
    if (player.playing && lineIdx % 2 === 1) {
      talk(`지금은 ‘${CHANNELS[player.ci].name}’ 채널이에요. 같이 들어요.`);
    } else {
      talk(MASCOT_LINES[lineIdx % MASCOT_LINES.length]);
    }
    lineIdx++;
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-poke]')) return;
    if (!isDesk()) mascotEl.scrollIntoView({ block: 'center', behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    talk('불렀어요? 저 여기 있어요!');
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { mascotVisible = en.isIntersecting; }).observe(mascotEl);
  }
  scheduleBlink();
}

// ── CLOCK ──────────────────────────────────────────────────────────────────
function initClock() {
  const clock = $('[data-clock]');
  const hh = $('[data-hh]', clock), mm = $('[data-mm]', clock);
  const dateEl = $('[data-date]');
  const icon = $('[data-sprite="clock"] canvas');
  const days = '일월화수목금토';
  const tick = () => {
    const d = new Date();
    hh.textContent = pad2(d.getHours());
    mm.textContent = pad2(d.getMinutes());
    clock.setAttribute('datetime', `${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
    dateEl.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
    if (icon) drawSprite(icon, 'clock');
    setTimeout(tick, (60 - d.getSeconds()) * 1000 + 30);
  };
  tick();
}

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  readPalette();
  drawAllSprites();
  loadSpriteSheet();
  initWindows();
  initPosts();
  initMusic();
  initPlayer();
  initPomodoro();
  initMemo();
  initGuestbook();
  initMascot();
  initClock();

  document.addEventListener('visibilitychange', () => { eqSync(); speakerAnim(); });
  reduceMQ.addEventListener('change', () => { eqSync(); speakerAnim(); scheduleBlink(); onPlayState(); });
  // 글꼴이 늦게 들어오면 창 높이가 바뀌므로 한 번 더 배치해요.
  document.fonts?.ready.then(() => layoutDesk());
  window.addEventListener('load', () => layoutDesk());
}

init();
