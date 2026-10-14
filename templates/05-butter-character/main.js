// 버티 (BUTTY) — 집중 타이머 앱 홈페이지 템플릿
// No libraries. Sections: CONFIG → SPRITES → RENDERER → PAGE (demo, countdown, header).

// ── CONFIG ───────────────────────────────────────────────────────────────
// Set a path to swap a procedural placeholder for a real file in /assets.
// Layout of the sprite sheet is documented in assets/README.md.
const ASSETS = {
  spriteSheet: null, // e.g. 'assets/butty-sheet.png' — 32×32 frames, one row per pose (SHEET_ROWS order)
  icons: null,       // e.g. 'assets/butty-icons.png' — 12×12 frames in one row (ICON_ORDER)
  logo: null,        // e.g. 'assets/butty-logo.png'  — 16×16 single frame
};

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── SPRITES ──────────────────────────────────────────────────────────────
// Every artwork is a pixel map: one character per logical pixel, '.' = transparent.
// Palette keys map to CSS custom properties, so the art always follows the page tokens.
//   o ink outline + face   h butter highlight   y butter   s butter shade
//   w cream (shine, cloth)  g sage              z ground shadow (set per canvas)
// Rules shared by every frame: 1px ink outline, light from top-left,
// 2-step shading (h on the top face, s on the right side + bottom), integer scale only.
const PALETTE_VARS = {
  o: '--c-pine', h: '--c-butter-hi', y: '--c-butter', s: '--c-butter-lo',
  w: '--c-cream', g: '--c-sage',
};
const GROUND = { butter: '--c-butter-lo', cream: '--c-sage', sage: '--c-butter-hi', none: null };

const GRID = 32;

// Parts are placed on the 32×32 grid at (x, y). Body-attached parts move with the bob/hop.
const PART = {
  shadow:      { x: 7,  y: 27, rows: ['zzzzzzzzzzzzzzzzzz', '..zzzzzzzzzzzzzz..'] },
  shadowSmall: { x: 10, y: 27, rows: ['zzzzzzzzzzzz', '.zzzzzzzzzz.'] },
  feet:        { x: 9,  y: 24, rows: ['osso......osso', 'osso......osso', 'osso......osso', 'oooo......oooo'] },
  body: { x: 6, y: 9, rows: [
    '..oooooooooooooooo..',
    '.ohhhhhhhhhhhhhhhho.',
    'ohwwhhhhhhhhhhhhhhho',
    'ohwhhhhhhhhhhhhhhhho',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    'oyyyyyyyyyyyyyyyyyso',
    '.osssssssssssssssso.',
    '..oooooooooooooooo..',
  ] },

  // faces ─────────────────────────────
  eyesOpen:    { x: 10, y: 16, rows: ['oo........oo', 'oo........oo'] },
  eyesBlink:   { x: 10, y: 17, rows: ['oo........oo'] },
  eyesHappy:   { x: 9,  y: 16, rows: ['.oo......oo.', 'o..o....o..o'] },
  eyesFocus:   { x: 9,  y: 14, rows: ['oo........oo', '..o......o..', '.oo......oo.', '.oo......oo.'] },
  eyesWorried: { x: 9,  y: 14, rows: ['..o......o..', 'oo........oo', '.oo......oo.', '.oo......oo.'] },
  eyesSparkle: { x: 10, y: 15, rows: ['ow........ow', 'oo........oo', 'oo........oo'] },
  eyesUp:      { x: 10, y: 15, rows: ['oo........oo', 'oo........oo'] },
  blush:       { x: 8,  y: 19, rows: ['ss............ss'] },
  mouthSmile:  { x: 14, y: 19, rows: ['o..o', '.oo.'] },
  mouthFlat:   { x: 14, y: 20, rows: ['oooo'] },
  mouthOpen:   { x: 14, y: 19, rows: ['oooo', 'osso', '.oo.'] },
  mouthFrown:  { x: 14, y: 19, rows: ['.oo.', 'o..o'] },
  mouthSmall:  { x: 15, y: 20, rows: ['oo'] },

  // arms ──────────────────────────────
  armL:      { x: 3,  y: 17, rows: ['.oo', 'oyy', 'oss', '.oo'] },
  armR:      { x: 26, y: 17, rows: ['oo.', 'yyo', 'sso', 'oo.'] },
  armLUp:    { x: 1,  y: 9,  rows: ['.oo..', 'oyyo.', 'oyyo.', '.oyyo', '.oyso', '..oso', '...oo'] },
  armRUp:    { x: 26, y: 9,  rows: ['..oo.', '.oyyo', '.oyyo', 'oyyo.', 'oyso.', 'oso..', 'oo...'] },
  armRUp2:   { x: 26, y: 10, rows: ['...oo.', '..oyyo', '.oyyo.', 'oyso..', 'oso...', 'oo....'] },
  armLUp2:   { x: 0,  y: 10, rows: ['.oo...', 'oyyo..', '.oyyo.', '..oyso', '...oso', '....oo'] },
  handMug:   { x: 22, y: 19, rows: ['.oo.', 'oyyo', 'osso', '.oo.'] },
  armRHold:  { x: 24, y: 18, rows: ['.oo.', 'oyyo', 'osso', '.oo.'] },

  // props ─────────────────────────────
  headband:  { x: 5,  y: 12, rows: ['oooooooooooooooooooooo', 'oooooooooooooooooooooo'] },
  knotA:     { x: 0,  y: 11, rows: ['oo...', '.oooo', '.oooo', 'oo...'] },
  knotB:     { x: 0,  y: 11, rows: ['.....', 'ooooo', 'o.ooo', '.o...'] },
  pencilA:   { x: 25, y: 9,  rows: ['..o..', '.owo.', 'owwwo', 'ohyso', 'ohyso', 'ohyso', 'ohyso', 'ooooo', 'ogggo', 'ooooo'] },
  pencilB:   { x: 26, y: 8,  rows: ['..o..', '.owo.', 'owwwo', 'ohyso', 'ohyso', 'ohyso', 'ohyso', 'ooooo', 'ogggo', 'ooooo'] },
  sweat:     { x: 7,  y: 4,  rows: ['.o.', 'owo', 'owo', '.o.'] },
  mug:       { x: 24, y: 16, rows: ['oooooo..', 'owwwwooo', 'ohhhho.o', 'owwwwo.o', 'owwwwooo', 'owwwwo..', 'owwwwo..', '.oooo...'] },
  steamA:    { x: 26, y: 10, rows: ['..o.', '.o..', '.o..', '..o.', '.o..'] },
  steamB:    { x: 26, y: 10, rows: ['.o..', '..o.', '..o.', '.o..', '..o.'] },
  pole:      { x: 3,  y: 2,  rows: Array.from({ length: 18 }, () => 'o') },
  flagA:     { x: 4,  y: 2,  rows: ['ooooooo.', 'wwwwwwwo', 'wwwwwowo', 'wowwowwo', 'wwowwwwo', 'oooooooo'] },
  flagB:     { x: 4,  y: 2,  rows: ['oooooo..', 'wwwwwwoo', 'wwwwwowo', 'wowwowwo', 'wwowwwwo', 'ooooooo.'] },
  bang:      { x: 15, y: 1,  rows: ['oo', 'oo', 'oo', 'oo', '..', 'oo'] },
  question:  { x: 3,  y: 1,  rows: ['.ooo.', 'o...o', '...o.', '..o..', '.....', '..o..'] },
  pointer:   { x: 26, y: 13, rows: ['....oo', '....oo', '...o..', '..o...', '.o....'] },
  pointer2:  { x: 26, y: 12, rows: ['....oo', '....oo', '...o..', '..o...', '.o....', '.o....'] },
  confettiA: { x: 2,  y: 3,  rows: [
    '..s.....................o...',
    '............................',
    '.......o....................',
    '..................s.........',
    'o...........................',
    '.........................s..',
  ] },
  confettiB: { x: 2,  y: 3,  rows: [
    '........o...................',
    '.....................s......',
    '..s.........................',
    '...........................o',
    '.........s..................',
    'o...........................',
  ] },
};

// Face / arm presets keep the frames below short.
const FACE = {
  idle:    ['eyesOpen', 'blush', 'mouthSmile'],
  blink:   ['eyesBlink', 'blush', 'mouthSmile'],
  focus:   ['eyesFocus', 'blush', 'mouthFlat'],
  rest:    ['eyesHappy', 'blush', 'mouthSmile'],
  done:    ['eyesSparkle', 'blush', 'mouthOpen'],
  worried: ['eyesWorried', 'blush', 'mouthFrown'],
  think:   ['eyesUp', 'blush', 'mouthSmall'],
};

// A frame = { dy, lift?, parts[] }. dy moves the body; lift also moves feet (a real hop).
// A pose = frames + timeline. `intro` plays once when the pose starts, then `loop` repeats.
// `still` is the frame shown when the visitor prefers reduced motion.
const f = (dy, parts, lift = false) => ({ dy, parts, lift });
const POSES = {
  idle: {
    frames: [
      f(0, [...FACE.idle, 'armL', 'armR']),
      f(-1, [...FACE.idle, 'armL', 'armR']),
      f(0, [...FACE.blink, 'armL', 'armR']),
    ],
    loop: [[0, 520], [1, 520], [0, 520], [1, 520], [0, 380], [2, 140], [0, 300], [1, 520]],
    still: 0,
  },
  focus: {
    frames: [
      f(0, [...FACE.focus, 'armL', 'armRHold', 'knotA', 'headband', 'pencilA']),
      f(0, [...FACE.focus, 'armL', 'armRHold', 'knotB', 'headband', 'pencilB']),
      f(0, [...FACE.focus, 'armL', 'armRHold', 'knotA', 'headband', 'pencilA', 'sweat']),
      f(-1, [...FACE.focus, 'armL', 'armRHold', 'knotB', 'headband', 'pencilA'], true),
    ],
    intro: [[3, 110]],
    loop: [[0, 200], [1, 200], [0, 200], [1, 200], [0, 200], [2, 600]],
    still: 0,
  },
  rest: {
    frames: [
      f(0, [...FACE.rest, 'armL', 'mug', 'handMug', 'steamA']),
      f(0, [...FACE.rest, 'armL', 'mug', 'handMug', 'steamB']),
      f(-1, [...FACE.rest, 'armL', 'mug', 'handMug', 'steamA'], true),
    ],
    intro: [[2, 110]],
    loop: [[0, 520], [1, 520]],
    still: 0,
  },
  done: {
    frames: [
      f(0, [...FACE.done, 'armL', 'armR', 'pole', 'flagA']),
      f(-2, [...FACE.done, 'armL', 'armR', 'pole', 'flagB'], true),
      f(-4, [...FACE.done, 'armL', 'armR', 'pole', 'flagA'], true),
      f(0, [...FACE.done, 'armL', 'armR', 'pole', 'flagB']),
      f(1, [...FACE.done, 'armL', 'armR', 'pole', 'flagA']),
    ],
    intro: [[4, 90], [1, 80], [2, 140], [1, 80], [4, 90], [0, 120], [1, 80], [2, 120], [1, 80], [4, 90]],
    loop: [[0, 420], [3, 420]],
    still: 0,
  },
  worried: {
    frames: [
      f(0, [...FACE.worried, 'armL', 'armR', 'bang', 'sweat']),
      f(-1, [...FACE.worried, 'armL', 'armR', 'bang', 'sweat']),
    ],
    loop: [[0, 160], [1, 160], [0, 160], [1, 160], [0, 900]],
    still: 0,
  },
  wave: {
    frames: [
      f(0, [...FACE.idle, 'armL', 'armRUp']),
      f(0, [...FACE.idle, 'armL', 'armRUp2']),
      f(0, [...FACE.blink, 'armL', 'armRUp']),
    ],
    loop: [[0, 260], [1, 260], [0, 260], [1, 260], [0, 900], [2, 140], [0, 600]],
    still: 0,
  },
  cheer: {
    frames: [
      f(0, [...FACE.rest, 'armLUp', 'armRUp']),
      f(-1, [...FACE.rest, 'armLUp2', 'armRUp2']),
    ],
    loop: [[0, 360], [1, 360]],
    still: 0,
  },
  point: {
    frames: [
      f(0, [...FACE.idle, 'armL', 'armRHold', 'pointer']),
      f(0, [...FACE.idle, 'armL', 'armRHold', 'pointer2']),
      f(0, [...FACE.blink, 'armL', 'armRHold', 'pointer']),
    ],
    loop: [[0, 420], [1, 420], [0, 420], [1, 420], [2, 140]],
    still: 0,
  },
  celebrate: {
    frames: [
      f(0, [...FACE.done, 'armLUp', 'armRUp', 'confettiA']),
      f(-1, [...FACE.done, 'armLUp2', 'armRUp2', 'confettiB'], true),
    ],
    loop: [[0, 300], [1, 300]],
    still: 0,
  },
  think: {
    frames: [
      f(0, [...FACE.think, 'armL', 'armR', 'question']),
      f(-1, [...FACE.think, 'armL', 'armR', 'question']),
      f(0, ['eyesBlink', 'blush', 'mouthSmall', 'armL', 'armR', 'question']),
    ],
    loop: [[0, 700], [1, 700], [0, 500], [2, 140], [0, 400], [1, 700]],
    still: 0,
  },
};
// Sprite-sheet row order (used when ASSETS.spriteSheet is set).
const SHEET_ROWS = ['idle', 'focus', 'rest', 'done', 'worried', 'wave', 'cheer', 'point', 'celebrate', 'think'];

// 12×12 icons (same outline + palette rules, used on buttons and benefit list).
const ICONS = {
  phone: [
    '..oooooooo..',
    '..owwwwwwo..',
    '..owwoowwo..',
    '..owwoowwo..',
    '..owwoowwo..',
    '..owwwwwwo..',
    '..owwoowwo..',
    '..owwwwwwo..',
    '..oyyyyyso..',
    '..oyyooyso..',
    '..oooooooo..',
    '............',
  ],
  timer: [
    '....oooo....',
    '.....oo.....',
    '...oooooo...',
    '..owwwwwwo..',
    '.owwwwowwwo.',
    '.owwwwowwwo.',
    '.owwwwoowwo.',
    '.owwwwwwwwo.',
    '.owwwwwwwwo.',
    '..owwwwwwo..',
    '...oooooo...',
    '............',
  ],
  mug: [
    '...o..o.....',
    '....o..o....',
    '...o..o.....',
    '............',
    '.oooooooo...',
    '.owwwwwwooo.',
    '.ohhhhhho.o.',
    '.owwwwwwo.o.',
    '.owwwwwwooo.',
    '.owwwwwwo...',
    '..oooooo....',
    '............',
  ],
  flag: [
    '.ooooooo....',
    '.oyyyyyyoo..',
    '.oyyyyyyyyo.',
    '.oyyyyyyyso.',
    '.oyyyyyysso.',
    '.oooooooooo.',
    '.o..........',
    '.o..........',
    '.o..........',
    '.o..........',
    'ooo.........',
    '............',
  ],
  stamp: [
    '.oooooooooo.',
    '.oyyyyyyyyo.',
    '.oooooooooo.',
    '.owwwwwwwwo.',
    '.owwwwwwwoo.',
    '.owwwwwwowo.',
    '.owowwwowwo.',
    '.owwowowwwo.',
    '.owwwowwwwo.',
    '.owwwwwwwwo.',
    '.oooooooooo.',
    '............',
  ],
};
  // cream glyph for dark buttons (no outline — the button is the outline)
ICONS.download = [
  '....wwww....',
  '....wwww....',
  '....wwww....',
  '....wwww....',
  '.wwwwwwwwww.',
  '..wwwwwwww..',
  '...wwwwww...',
  '....wwww....',
  '.....ww.....',
  'ww........ww',
  'ww........ww',
  'wwwwwwwwwwww',
];
const ICON_ORDER = ['phone', 'timer', 'mug', 'flag', 'stamp', 'download'];

// 16×16 logo mark (also exported as the favicon in index.html).
const LOGO = [
  '................',
  '..oooooooooooo..',
  '.ohwwhhhhhhhhho.',
  '.ohwhhhhhhhhhho.',
  '.oyyyyyyyyyyyso.',
  '.oyyyyyyyyyyyso.',
  '.oyyooyyyyooyso.',
  '.oyyooyyyyooyso.',
  '.oysyyoyyoyysso.',
  '.oyyyyyooyyyyso.',
  '.oyyyyyyyyyyyso.',
  '.osssssssssssso.',
  '..oooooooooooo..',
  '....oo....oo....',
  '................',
  '................',
];

// ── RENDERER ─────────────────────────────────────────────────────────────
const rootStyle = getComputedStyle(document.documentElement);
const cssColor = (name) => (name ? rootStyle.getPropertyValue(name).trim() : null);
const COLORS = Object.fromEntries(Object.entries(PALETTE_VARS).map(([k, v]) => [k, cssColor(v)]));

function paint(ctx, rows, ox, oy, ground) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = ch === 'z' ? ground : COLORS[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function drawFrame(ctx, frame, ground) {
  ctx.clearRect(0, 0, GRID, GRID);
  const put = (name, dy) => paint(ctx, PART[name].rows, PART[name].x, PART[name].y + dy, ground);
  const behind = new Set(['pole']); // drawn before the body
  // ground shadow stays on the floor; it shrinks while 버티 is in the air
  if (ground) put(frame.lift && frame.dy < -2 ? 'shadowSmall' : 'shadow', 0);
  frame.parts.filter((n) => behind.has(n)).forEach((n) => put(n, frame.dy));
  put('feet', frame.lift ? frame.dy : 0); // feet stay planted during a bob, leave the floor on a hop
  put('body', frame.dy);
  frame.parts.filter((n) => !behind.has(n)).forEach((n) => put(n, frame.dy));
}

let sheetImage = null;
let iconImage = null;
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fall back to the procedural art
    img.src = src;
  });
}

class Buddy {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = GRID;
    canvas.height = GRID;
    this.ground = cssColor(GROUND[canvas.dataset.ground || 'cream']);
    this.visible = false;
    this.setPose(canvas.dataset.pose || 'idle');
  }
  setPose(name) {
    this.pose = POSES[name] ? name : 'idle';
    this.t0 = performance.now();
    this.last = -1;
    this.tick(this.t0);
  }
  frameAt(now) {
    const pose = POSES[this.pose];
    if (REDUCED.matches) return pose.still;
    let t = now - this.t0;
    const pick = (list, time) => {
      for (const [frame, ms] of list) { if (time < ms) return frame; time -= ms; }
      return list[list.length - 1][0];
    };
    const total = (list) => list.reduce((sum, [, ms]) => sum + ms, 0);
    if (pose.intro) {
      const len = total(pose.intro);
      if (t < len) return `i${pick(pose.intro, t)}`;
      t -= len;
    }
    return pick(pose.loop, t % total(pose.loop));
  }
  tick(now) {
    const key = this.frameAt(now);
    if (key === this.last) return;
    this.last = key;
    const index = typeof key === 'string' ? Number(key.slice(1)) : key;
    const frame = POSES[this.pose].frames[index];
    if (sheetImage) {
      // real art: the code still paints the ground shadow so it matches each background
      this.ctx.clearRect(0, 0, GRID, GRID);
      if (this.ground) {
        const s = PART[frame.lift && frame.dy < -2 ? 'shadowSmall' : 'shadow'];
        paint(this.ctx, s.rows, s.x, s.y, this.ground);
      }
      this.ctx.drawImage(sheetImage, index * GRID, SHEET_ROWS.indexOf(this.pose) * GRID, GRID, GRID, 0, 0, GRID, GRID);
    } else {
      drawFrame(this.ctx, frame, this.ground);
    }
  }
}

function drawStatic(canvas, rows, size, image, index = 0) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  if (image) ctx.drawImage(image, index * size, 0, size, size, 0, 0, size, size);
  else paint(ctx, rows, 0, 0, null);
}

const buddies = new Map();
let rafId = 0;
function loop(now) {
  rafId = 0;
  let any = false;
  for (const b of buddies.values()) {
    if (!b.visible) continue;
    b.tick(now);
    any = true;
  }
  if (any && !document.hidden && !REDUCED.matches) rafId = requestAnimationFrame(loop);
}
function wake() { if (!rafId && !document.hidden && !REDUCED.matches) rafId = requestAnimationFrame(loop); }

async function initSprites() {
  if (ASSETS.spriteSheet) sheetImage = await loadImage(ASSETS.spriteSheet);
  if (ASSETS.icons) iconImage = await loadImage(ASSETS.icons);
  const logoImage = ASSETS.logo ? await loadImage(ASSETS.logo) : null;

  document.querySelectorAll('canvas[data-logo]').forEach((c) => drawStatic(c, LOGO, 16, logoImage));
  document.querySelectorAll('canvas[data-icon]').forEach((c) => {
    const name = c.dataset.icon;
    drawStatic(c, ICONS[name] || ICONS.phone, 12, iconImage, Math.max(0, ICON_ORDER.indexOf(name)));
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const b = buddies.get(e.target);
      if (b) b.visible = e.isIntersecting;
    }
    wake();
  }, { rootMargin: '80px' });

  document.querySelectorAll('canvas[data-pose]').forEach((c) => {
    buddies.set(c, new Buddy(c));
    io.observe(c);
  });

  document.addEventListener('visibilitychange', wake);
  REDUCED.addEventListener('change', () => {
    for (const b of buddies.values()) { b.last = -1; b.tick(performance.now()); }
    wake();
  });
}

// ── PAGE ─────────────────────────────────────────────────────────────────
// Demo: 집중 / 휴식 / 완료 buttons switch 버티's pose, bubble, readout and the explanation line.
const DEMO_STATES = {
  focus: {
    label: '집중',
    bubble: '같이 버텨보자!',
    readout: '25:00',
    seconds: 25 * 60,
    note: '25분 동안 고른 앱의 알림을 멈추고, 버티가 옆에서 같이 집중해요.',
    alt: '머리띠를 매고 연필을 든 버티가 진지한 눈으로 집중하고 있어요.',
  },
  rest: {
    label: '휴식',
    bubble: '잠깐 숨 돌려요',
    readout: '05:00',
    seconds: 5 * 60,
    note: '5분 휴식 타이머가 돌아가요. 끝나기 30초 전에 버티가 다음 세트를 알려 줘요.',
    alt: '눈을 감고 웃는 버티가 김이 나는 컵을 들고 쉬고 있어요.',
  },
  done: {
    label: '완료',
    bubble: '오늘도 해냈다!',
    readout: '+25분',
    note: '끝낸 세트를 기록에 저장하고, 오늘 날짜에 도장을 찍어요.',
    alt: '입을 크게 벌려 웃는 버티가 체크 깃발을 들고 폴짝 뛰어요.',
  },
};

function initDemo() {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-state]')];
  const canvas = root.querySelector('canvas[data-pose]');
  const bubble = root.querySelector('[data-demo-bubble]');
  const readout = root.querySelector('[data-demo-readout]');
  const stateName = root.querySelector('[data-demo-state]');
  const note = root.querySelector('[data-demo-note]');
  let tick = 0;
  const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  // focus / rest run a real countdown in the readout (paused when the tab is hidden)
  function runClock(seconds) {
    clearInterval(tick);
    if (!seconds || REDUCED.matches) return;
    let left = seconds;
    tick = setInterval(() => {
      if (document.hidden) return;
      left = left > 0 ? left - 1 : seconds;
      readout.textContent = fmt(left);
    }, 1000);
  }

  function select(key) {
    const s = DEMO_STATES[key];
    if (!s) return;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.state === key)));
    const buddy = buddies.get(canvas);
    if (buddy) buddy.setPose(key);
    wake();
    canvas.setAttribute('aria-label', s.alt);
    root.dataset.current = key;
    bubble.textContent = s.bubble;
    readout.textContent = s.readout;
    runClock(s.seconds);
    stateName.textContent = s.label;
    note.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = `${s.label} 모드`;
    note.append(strong, ` ${s.note}`);
    // restart the bubble pop
    bubble.classList.remove('is-pop');
    void bubble.offsetWidth;
    bubble.classList.add('is-pop');
  }

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn.dataset.state));
    btn.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      buttons[(i + step + buttons.length) % buttons.length].focus();
    });
  });
}

// Hero phone: a live 25:00 countdown, only while it is on screen.
function initCountdown() {
  const el = document.querySelector('[data-countdown]');
  if (!el || REDUCED.matches) return;
  let left = 25 * 60;
  let timer = 0;
  let onScreen = false;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const run = () => {
    clearInterval(timer);
    timer = 0;
    if (!onScreen || document.hidden) return;
    timer = setInterval(() => {
      left = left > 0 ? left - 1 : 25 * 60;
      el.textContent = fmt(left);
    }, 1000);
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(el);
  document.addEventListener('visibilitychange', run);
}

// Streak calendar in the 연속 기록 phone: October 2026 starts on a Thursday.
function initCalendar() {
  const grid = document.querySelector('[data-calendar]');
  if (!grid) return;
  const today = 14;
  const missed = new Set([2]);
  const cells = ['일', '월', '화', '수', '목', '금', '토'].map((d) => `<span class="wd">${d}</span>`);
  for (let i = 0; i < 4; i++) cells.push('<span></span>');
  for (let d = 1; d <= 31; d++) {
    let cls = 'future';
    if (d === today) cls = 'today';
    else if (d < today) cls = missed.has(d) ? '' : 'stamp';
    cells.push(`<span class="${cls}">${d}</span>`);
  }
  grid.innerHTML = cells.join('');
}

// The phone row scrolls sideways on small screens; make it a tab stop only then.
function initScroller() {
  const row = document.querySelector('.screens-row');
  if (!row) return;
  const update = () => {
    if (row.scrollWidth > row.clientWidth + 1) row.setAttribute('tabindex', '0');
    else row.removeAttribute('tabindex');
  };
  new ResizeObserver(update).observe(row);
}

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);
}

initSprites().then(initDemo);
initCountdown();
initCalendar();
initScroller();
initHeader();
