/* DOTLINE — 01 모노크롬 도트 · homepage template
 * Plain ES module, no libraries.
 * Sections: CONFIG → PALETTE → SPRITES (data, SVG icons, PNG loader) → SPRITES · DOT MATRIX RENDERER
 *           → HERO → FEATURES → CTA → UI → INIT
 */

// ── CONFIG ──────────────────────────────────────────────────────────────────
// Leave a key as null to use the procedural dot placeholder drawn below.
// Set a path (relative to this folder) to use a real file instead — see assets/README.md.
const ASSETS = {
  heroFrames: null,    // 'assets/hero-frames.png'    100×25 px · 4 frames of 25×25, left → right
  featureFrames: null, // 'assets/feature-frames.png' 31×39 px  · 3 frames of 31×13, top → bottom
  caseIcons: null,     // 'assets/case-icons.png'     36×9 px   · 4 icons of 9×9, left → right
  logo: null,          // 'assets/logo.svg'           square brand mark (replaces the 5×5 dot "D")
  productShot: null,   // 'assets/product-screen.png' optional: replaces the HTML app mock
};

const TIMING = {
  heroHold: 5200,       // ms each hero shape stays on screen
  heroStagger: 1100,    // ms spread of the dot-by-dot fade between shapes
  heroFade: 420,        // ms fade of a single dot
  featureStagger: 650,
  featureFade: 280,
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── PALETTE ─────────────────────────────────────────────────────────────────
// Dot colours are read from the CSS tokens so style.css stays the single source of colour.
const LEVEL = { ' ': -1, '.': 0, '#': 1, r: 2 };
let PAL = [];

function parseColor(value) {
  const v = value.trim();
  if (v.startsWith('#')) {
    let h = v.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const m = v.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
}

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const tok = (name) => parseColor(cs.getPropertyValue(name));
  PAL = [tok('--line'), tok('--text'), tok('--accent')];
  PAL.bg = tok('--bg');
}

// ── SPRITES ─────────────────────────────────────────────────────────────────
// Every dot graphic on the page is a map of strings, one character per dot:
//   ' ' no dot (outside the display)   '.' unlit dot  (--line)
//   '#' lit dot (--text)               'r' accent dot (--accent)
// One grid per artwork, round dots, same dot/cell ratio everywhere.
// Replace with PNGs via ASSETS (frames are read pixel-by-pixel into the same format).
const SPRITES = {
  // Hero symbol · 25×25 round display. LISTEN → TRANSCRIBE → EXTRACT → DRAFT
  hero: {
    listen: [
      '         .......         ',
      '       ...........       ',
      '     ...............     ',
      '    .................    ',
      '   .........r.........   ',
      '  .....................  ',
      '  .....................  ',
      ' ....................... ',
      ' ......##.......##...... ',
      '.......##.......##.......',
      '.......##.......##.......',
      '.......##.......##.......',
      '.........................',
      '.........................',
      '.........................',
      '........#.......#........',
      ' ........#######........ ',
      ' ....................... ',
      '  .....................  ',
      '  .....................  ',
      '   ...................   ',
      '    .................    ',
      '     ...............     ',
      '       ...........       ',
      '         .......         ',
    ],
    transcribe: [
      '         .......         ',
      '       ...........       ',
      '     ...............     ',
      '    .................    ',
      '   .........#.........   ',
      '  ..........#...#......  ',
      '  ........#.#...#......  ',
      ' .........#.#.#.#....... ',
      ' .....#...#.#.#.#.#..... ',
      '......#.#.#.#.#.#.#......',
      '....#.#.#.#.#.#.#.#.#....',
      '..#.#.#.#.#.#.#.#.#.#.#..',
      '#.#.#.#.#.#.#.#.#.#.#.#.#',
      '..#.#.#.#.#.#.#.#.#.#.#..',
      '....#.#.#.#.#.#.#.#.#....',
      '......#.#.#.#.#.#.#......',
      ' .....#...#.#.#.#.#..... ',
      ' .........#.#.#.#....... ',
      '  ........#.#...#......  ',
      '  ..........#...#......  ',
      '   .........#.........   ',
      '    .................    ',
      '     ...............     ',
      '       ...........       ',
      '         .......         ',
    ],
    extract: [
      '         .......         ',
      '       ...........       ',
      '     ...............     ',
      '    .................    ',
      '   ...................   ',
      '  .....................  ',
      '  ...###...............  ',
      ' ....###..##########.... ',
      ' ....###................ ',
      '.........................',
      '.........................',
      '.....###.................',
      '.....###..########.......',
      '.....###.................',
      '.........................',
      '.........................',
      ' ....rrr................ ',
      ' ....r.r..#########..... ',
      '  ...rrr...............  ',
      '  .....................  ',
      '   ...................   ',
      '    .................    ',
      '     ...............     ',
      '       ...........       ',
      '         .......         ',
    ],
    draft: [
      '         .......         ',
      '       ...........       ',
      '     ...............     ',
      '    ..#########......    ',
      '   ...#.......##......   ',
      '  ....#.......#.#......  ',
      '  ....#.......#..#.....  ',
      ' .....#.......#####..... ',
      ' .....#...........#..... ',
      '......#.#####.....#......',
      '......#...........#......',
      '......#...........#......',
      '......#.#########.#......',
      '......#...........#......',
      '......#.#######...#......',
      '......#...........#......',
      ' .....#.########..#..... ',
      ' .....#...........#..... ',
      '  ....#.####.r....#....  ',
      '  ....#...........#....  ',
      '   ...#...........#...   ',
      '    ..#############..    ',
      '     ...............     ',
      '       ...........       ',
      '         .......         ',
    ],
  },

  // Feature strip · 31×13. input → (red arrow) → output, one chain: audio → summary → tasks → doc
  feature: {
    summary: [
      '...............................',
      '.....#.........................',
      '.....#...#........r.########...',
      '...#.#...#.....................',
      '...#.#.#.#....r...#.######.....',
      '.#.#.#.#.#.#...r...............',
      '.#.#.#.#.#.#....r.#.#########..',
      '.#.#.#.#.#.#...r...............',
      '...#.#.#.#....r...#.#####......',
      '...#.#...#.....................',
      '.....#...#........#.#######....',
      '.....#.........................',
      '...............................',
    ],
    tasks: [
      '...............................',
      '..................###..........',
      '.#.########.......###.#######..',
      '..................###..........',
      '.#.######.....r................',
      '...............r..###..........',
      '.#.#########....r.###.#####....',
      '...............r..###..........',
      '.#.#####......r................',
      '..................rrr..........',
      '.#.#######........r.r.######...',
      '..................rrr..........',
      '...............................',
    ],
    draft: [
      '....................#######....',
      '.###................#.....##...',
      '.###.#######........#.....#.#..',
      '.###................#.....####.',
      '..............r.....#........#.',
      '.###...........r....#.####...#.',
      '.###.#####......r...#........#.',
      '.###...........r....#.######.#.',
      '..............r.....#........#.',
      '.###................#.###.r..#.',
      '.###.######.........#........#.',
      '.###................#........#.',
      '....................##########.',
    ],
  },

  // Small icons · 5×5 brand mark / avatar, 9×9 use-case icons. One accent dot each.
  icons: {
    logo: [
      '#### ',
      '#   #',
      '# r #',
      '#   #',
      '#### ',
    ],
    team: [
      '.....',
      '.#.#.',
      '.....',
      '#...#',
      '.###.',
    ],
    weekly: [
      '.#.....#.',
      '#########',
      '#.......#',
      '#.#.#.#.#',
      '#.......#',
      '#.#.#.r.#',
      '#.......#',
      '#.#.#...#',
      '#########',
    ],
    interview: [
      '...###..r',
      '..#####..',
      '..#####..',
      '#.#####.#',
      '#..###..#',
      '.#.....#.',
      '..#####..',
      '....#....',
      '..#####..',
    ],
    lecture: [
      '#########',
      '#.......#',
      '#.###...#',
      '#.....r.#',
      '#.#####.#',
      '#.......#',
      '#########',
      '...#.#...',
      '..#...#..',
    ],
    oneonone: [
      '######...',
      '#....#...',
      '#....#...',
      '######...',
      '.#.######',
      '...#....#',
      '...#..r.#',
      '...######',
      '.......#.',
    ],
  },
};

// Hero sequence: shape, readout name, and an optional "live" detail that plays while the shape holds.
// live(t) returns a key for the current moment; variant(map, key) returns the map for that key.
const HERO_SEQUENCE = [
  {
    id: 'listen', name: 'LISTEN',
    live: (t) => ((t > 2600 && t < 2760) || (t > 2960 && t < 3080) ? 'blink' : ''),
    variant: (m, k) => (k === 'blink' ? paint(m, [[7, 8, 2, 3, '.'], [16, 8, 2, 3, '.']]) : m),
  },
  {
    id: 'transcribe', name: 'TRANSCRIBE',
    live: (t) => (t > 1500 ? 'p' + Math.min(12, Math.floor((t - 1500) / 260)) : ''),
    variant: (m, k) => (k ? recolorColumn(m, Number(k.slice(1)) * 2, '#', 'r') : m),
  },
  {
    id: 'extract', name: 'EXTRACT',
    live: (t) => (t > 2700 ? 'done' : ''),
    variant: (m, k) => (k === 'done' ? paint(m, [[5, 16, 3, 3, 'r']]) : m),
  },
  {
    id: 'draft', name: 'DRAFT',
    live: (t) => {
      if (t < 1600) return '';
      const len = Math.min(7, 4 + Math.floor((t - 1600) / 380));
      const caret = len < 7 || Math.floor(t / 480) % 2 === 0;
      return `${len}:${caret ? 1 : 0}`;
    },
    variant: (m, k) => {
      if (!k) return m;
      const [len, caret] = k.split(':').map(Number);
      return paint(m, [[8, 18, 10, 1, '.'], [8, 18, len, 1, '#'], ...(caret ? [[8 + len + 1, 18, 1, 1, 'r']] : [])]);
    },
  },
];

const FEATURE_META = {
  summary: { fx: '01', name: 'SUMMARY', in: 'AUDIO 42:10', out: '05 LINES', label: '음성 파형이 다섯 줄 요약으로 바뀌는 도트 그림' },
  tasks: { fx: '02', name: 'TASKS', in: '05 LINES', out: '06 TASKS', label: '요약 문장이 체크리스트 할 일로 바뀌는 도트 그림' },
  draft: { fx: '03', name: 'DRAFT', in: '06 TASKS', out: '01 DRAFT', label: '할 일 목록이 문서 초안 한 장으로 바뀌는 도트 그림' },
};

// Paint rectangles [x, y, w, h, char] onto a copy of a map (never paints outside the display).
function paint(map, rects) {
  const rows = map.map((r) => [...r]);
  for (const [x0, y0, w, h, ch] of rects) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (rows[y] && rows[y][x] !== undefined && rows[y][x] !== ' ') rows[y][x] = ch;
      }
    }
  }
  return rows.map((r) => r.join(''));
}

function recolorColumn(map, x, from, to) {
  return map.map((row) => (row[x] === from ? row.slice(0, x) + to + row.slice(x + 1) : row));
}

// Inline SVG for small dot icons (logo, avatars, use cases). Scales cleanly at any integer size.
// Small icons skip the unlit dots (off = false) so their silhouettes stay clean.
function dotSVG(map, r = 0.36, off = true) {
  const h = map.length;
  const w = map[0].length;
  let s = `<svg class="dots" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">`;
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const lv = LEVEL[ch];
      if (lv === undefined || lv < 0 || (lv === 0 && !off)) return;
      s += `<circle class="d${lv}" cx="${x + 0.5}" cy="${y + 0.5}" r="${r}"/>`;
    });
  });
  return s + '</svg>';
}

// A one-row dot meter, e.g. data-dotbar="21/30" → 21 lit dots out of 30.
function dotBarSVG(on, total) {
  return dotSVG([Array.from({ length: total }, (_, i) => (i < on ? '#' : '.')).join('')], 0.34);
}

// Player waveform: columns of dots, played part lit, playhead column in accent, rest muted.
function dotWaveSVG(cols = 72, rows = 5, played = 0.1) {
  const ph = Math.floor(cols * played);
  let s = `<svg class="dots" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false">`;
  for (let x = 0; x < cols; x++) {
    // speech-like bursts: slow envelope × fast detail, at least one dot per column
    const env = 0.55 + 0.45 * Math.sin(x * 0.19 + 0.6);
    const detail = Math.abs(Math.sin(x * 1.37 + Math.sin(x * 0.43) * 2));
    const h = Math.max(1, Math.min(rows, Math.round(1 + env * detail * (rows - 0.6))));
    const top = Math.floor((rows - h) / 2);
    for (let y = 0; y < rows; y++) {
      const lit = y >= top && y < top + h;
      const cls = x === ph ? 2 : !lit ? 0 : x < ph ? 1 : 3;
      s += `<circle class="d${cls}" cx="${x + 0.5}" cy="${y + 0.5}" r="0.32"/>`;
    }
  }
  return s + '</svg>';
}

// Read a PNG sprite sheet into dot maps (nearest palette colour; transparent → no dot).
async function loadFrames(src, fw, fh, count, vertical = false) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  const ref = [['.', PAL.bg], ['.', PAL[0]], ['#', PAL[1]], ['r', PAL[2]]];
  const classify = (i) => {
    if (data[i + 3] < 128) return ' ';
    let best = '.';
    let bd = Infinity;
    for (const [ch, [r, gg, b]] of ref) {
      const d = (data[i] - r) ** 2 + (data[i + 1] - gg) ** 2 + (data[i + 2] - b) ** 2;
      if (d < bd) { bd = d; best = ch; }
    }
    return best;
  };
  const frames = [];
  for (let f = 0; f < count; f++) {
    const ox = vertical ? 0 : f * fw;
    const oy = vertical ? f * fh : 0;
    const rows = [];
    for (let y = 0; y < fh; y++) {
      let s = '';
      for (let x = 0; x < fw; x++) s += classify(((oy + y) * c.width + ox + x) * 4);
      rows.push(s);
    }
    frames.push(rows);
  }
  return frames;
}

// ── SPRITES · DOT MATRIX RENDERER ───────────────────────────────────────────
// Renders a dot map to <canvas> as round LED dots on an integer grid.
// set(map) fades each changed dot individually with a staggered delay.
class DotMatrix {
  constructor(canvas, map, { dot = 0.72, sweep = 'y', seed = 7 } = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.rows = map.length;
    this.cols = map[0].length;
    this.dot = dot;
    this.sweep = sweep;
    const n = (this.n = this.rows * this.cols);
    this.mask = new Uint8Array(n);
    this.level = new Int8Array(n).fill(-1);
    this.cur = new Float32Array(n * 3);
    this.from = new Float32Array(n * 3);
    this.to = new Float32Array(n * 3);
    this.t0 = new Float64Array(n);
    this.dur = new Float32Array(n);
    this.busy = new Uint8Array(n);
    this.rnd = new Float32Array(n);
    let s = seed * 9301 + 49297;
    for (let i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647;
      this.rnd[i] = s / 2147483647;
    }
    this.raf = 0;
    this.tick = this.tick.bind(this);
    this.set(map, { instant: true });
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  set(map, { instant = false, stagger = 0, fade = 0 } = {}) {
    const now = performance.now();
    const quick = instant || reduceMotion.matches || fade === 0;
    let pending = false;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        const lv = LEVEL[map[y]?.[x] ?? ' '] ?? 0;
        this.mask[i] = lv >= 0 ? 1 : 0;
        if (lv < 0 || lv === this.level[i]) continue;
        this.level[i] = lv;
        const c = PAL[lv];
        const j = i * 3;
        if (quick) {
          this.cur.set(c, j);
          this.busy[i] = 0;
          continue;
        }
        this.from.set(this.cur.subarray(j, j + 3), j);
        this.to.set(c, j);
        const k = this.sweep === 'x' ? x / (this.cols - 1) : y / (this.rows - 1);
        this.t0[i] = now + stagger * (0.6 * this.rnd[i] + 0.4 * k);
        this.dur[i] = fade;
        this.busy[i] = 1;
        pending = true;
      }
    }
    if (pending) this.kick();
    else this.draw();
  }

  kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.raf = 0;
    let pending = false;
    for (let i = 0; i < this.n; i++) {
      if (!this.busy[i]) continue;
      const p = (now - this.t0[i]) / this.dur[i];
      if (p < 0) { pending = true; continue; }
      const j = i * 3;
      if (p >= 1) {
        this.cur.set(this.to.subarray(j, j + 3), j);
        this.busy[i] = 0;
        continue;
      }
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      for (let q = 0; q < 3; q++) this.cur[j + q] = this.from[j + q] + (this.to[j + q] - this.from[j + q]) * e;
      pending = true;
    }
    this.draw();
    if (pending) this.kick();
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
    this.draw();
  }

  draw() {
    if (!this.w) return;
    const { ctx, cols, rows } = this;
    // integer cell size in CSS px → every dot sits on the same grid, no fractional scaling
    const cell = Math.max(2, Math.floor(Math.min(this.w / cols, this.h / rows)));
    const ox = Math.round((this.w - cell * cols) / 2);
    const oy = Math.round((this.h - cell * rows) / 2);
    const rad = (cell * this.dot) / 2;
    // unlit dots sit slightly smaller; a dot swells to full size as it lights up
    const lo = Math.max(...PAL[0]);
    const span = Math.max(...PAL[1]) - lo || 1;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (!this.mask[i]) continue;
        const j = i * 3;
        const r = this.cur[j];
        const g = this.cur[j + 1];
        const b = this.cur[j + 2];
        const lit = Math.min(1, Math.max(0, (Math.max(r, g, b) - lo) / span));
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.beginPath();
        ctx.arc(ox + (x + 0.5) * cell, oy + (y + 0.5) * cell, rad * (0.78 + 0.22 * lit), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Runs a callback on every frame only while the element is on screen and the tab is visible.
function whileVisible(el, onFrame) {
  let raf = 0;
  let last = 0;
  let inView = false;
  const loop = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    onFrame(dt);
    raf = requestAnimationFrame(loop);
  };
  const update = () => {
    const run = inView && !document.hidden && !reduceMotion.matches;
    if (run && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(el);
  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener?.('change', update);
}

// ── HERO ────────────────────────────────────────────────────────────────────
function initHero(frames, withLive) {
  const canvas = $('[data-matrix="hero"]');
  if (!canvas) return;
  const matrix = new DotMatrix(canvas, frames[0], { sweep: 'y', seed: 11 });
  const idxEl = $('[data-hero-index]');
  const nameEl = $('[data-hero-name]');
  const steps = $$('[data-hero-steps] i');
  const seq = HERO_SEQUENCE.slice(0, frames.length);
  let t = 0;
  let phase = 0;
  let liveKey = '';

  const showMeta = (p) => {
    if (idxEl) idxEl.textContent = String(p + 1).padStart(2, '0');
    if (nameEl) nameEl.textContent = seq[p]?.name ?? '';
    steps.forEach((s, i) => s.classList.toggle('is-on', i === p));
  };
  showMeta(0);

  whileVisible(canvas, (dt) => {
    t += dt;
    const p = Math.floor(t / TIMING.heroHold) % frames.length;
    const lt = t % TIMING.heroHold;
    if (p !== phase) {
      phase = p;
      liveKey = '';
      matrix.set(frames[p], { stagger: TIMING.heroStagger, fade: TIMING.heroFade });
      showMeta(p);
      return;
    }
    if (!withLive) return;
    const step = seq[p];
    const k = step.live ? step.live(lt) : '';
    if (k !== liveKey) {
      liveKey = k;
      matrix.set(step.variant(frames[p], k), { stagger: 0, fade: 140 });
    }
  });
}

// ── FEATURES (accessible tabs + dot stage) ──────────────────────────────────
function initFeatures(maps) {
  const tabs = $$('[role="tab"][data-feature]');
  const canvas = $('[data-matrix="feature"]');
  if (!tabs.length || !canvas) return;
  const matrix = new DotMatrix(canvas, maps.summary, { sweep: 'x', seed: 3 });
  const ioIn = $('[data-io-in]');
  const ioOut = $('[data-io-out]');
  const fxIndex = $('[data-fx-index]');
  const fxName = $('[data-fx-name]');

  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    const id = tab.dataset.feature;
    const meta = FEATURE_META[id];
    matrix.set(maps[id], { stagger: TIMING.featureStagger, fade: TIMING.featureFade });
    canvas.setAttribute('aria-label', meta.label);
    if (ioIn) ioIn.textContent = meta.in;
    if (ioOut) ioOut.textContent = meta.out;
    if (fxIndex) fxIndex.textContent = meta.fx;
    if (fxName) fxName.textContent = meta.name;
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      select(next, true);
    });
  });
}

// ── CTA (small symbol, blinks now and then) ─────────────────────────────────
function initCta(face) {
  const canvas = $('[data-matrix="cta"]');
  if (!canvas) return;
  const matrix = new DotMatrix(canvas, face, { seed: 5 });
  const step = HERO_SEQUENCE[0];
  let t = 0;
  let key = '';
  whileVisible(canvas, (dt) => {
    t = (t + dt) % 4200;
    const k = step.live(t);
    if (k !== key) {
      key = k;
      matrix.set(step.variant(face, k), { stagger: 0, fade: 120 });
    }
  });
}

// ── UI ──────────────────────────────────────────────────────────────────────
function initMenu() {
  const btn = $('.menu-toggle');
  const nav = $('#site-nav');
  if (!btn || !nav) return;
  const setOpen = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); btn.focus(); }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

function initRecTimer() {
  const el = $('[data-rec-timer]');
  if (!el || reduceMotion.matches) return;
  let s = 42;
  setInterval(() => {
    if (document.hidden) return;
    s = (s + 1) % 3600;
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
}

function renderIcons(icons) {
  $$('[data-dots]').forEach((el) => {
    const id = el.dataset.dots;
    if (id === 'logo' && ASSETS.logo) {
      el.innerHTML = `<img src="${ASSETS.logo}" alt="" width="20" height="20">`;
      return;
    }
    if (icons[id]) el.innerHTML = dotSVG(icons[id], 0.36, false);
  });
  $$('[data-dotbar]').forEach((el) => {
    const [on, total] = el.dataset.dotbar.split('/').map(Number);
    el.innerHTML = dotBarSVG(on, total);
  });
  // waveform: one 6px dot cell per column, re-drawn to fill the player width
  $$('[data-dotwave]').forEach((el) => {
    let cols = 0;
    const draw = () => {
      const next = Math.max(24, Math.floor(el.clientWidth / 6));
      if (next !== cols) { cols = next; el.innerHTML = dotWaveSVG(cols); }
    };
    draw();
    new ResizeObserver(draw).observe(el);
  });
}

function swapProductShot() {
  const fig = $('[data-product-shot]');
  if (!fig || !ASSETS.productShot) return;
  fig.innerHTML = `<img src="${ASSETS.productShot}" alt="${fig.getAttribute('aria-label') || ''}" loading="lazy">`;
  fig.removeAttribute('aria-label');
}

// ── INIT ────────────────────────────────────────────────────────────────────
async function tryFrames(src, ...args) {
  if (!src) return null;
  try {
    return await loadFrames(src, ...args);
  } catch (err) {
    console.warn(`[DOTLINE] ${src} 을(를) 읽지 못해 기본 도트 그림을 씁니다.`, err);
    return null;
  }
}

async function init() {
  readPalette();
  initMenu();
  initRecTimer();
  swapProductShot();

  const [heroPng, featurePng, iconPng] = await Promise.all([
    tryFrames(ASSETS.heroFrames, 25, 25, 4),
    tryFrames(ASSETS.featureFrames, 31, 13, 3, true),
    tryFrames(ASSETS.caseIcons, 9, 9, 4),
  ]);

  const icons = { ...SPRITES.icons };
  if (iconPng) ['weekly', 'interview', 'lecture', 'oneonone'].forEach((k, i) => { icons[k] = iconPng[i]; });
  renderIcons(icons);

  const heroFrames = heroPng || HERO_SEQUENCE.map((s) => SPRITES.hero[s.id]);
  initHero(heroFrames, !heroPng);

  const f = SPRITES.feature;
  const featureMaps = featurePng ? { summary: featurePng[0], tasks: featurePng[1], draft: featurePng[2] } : f;
  initFeatures(featureMaps);

  initCta(heroFrames[0]);
}

init();
