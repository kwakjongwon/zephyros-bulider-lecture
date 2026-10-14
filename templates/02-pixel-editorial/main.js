/* MONUN STUDIO — main.js
 * 순서: CONFIG → SPRITES(팔레트 · 픽셀 맵 · 장면 그리기) → RENDERER(판 크기 · 재생) → UI
 * 외부 라이브러리 없이 동작합니다.
 */

// ════════════════════════════════════════════════════════════════════
// CONFIG — 실제 이미지로 바꾸기
// ────────────────────────────────────────────────────────────────────
// 값이 null 이면 코드로 그린 그림(아래 SPRITES)을 씁니다.
// 경로를 넣으면 그 파일을 대신 씁니다. 애니메이션은 프레임을 가로로 이어 붙인
// 스프라이트 시트 PNG 한 장으로 넣어 주세요.  예) { src: 'assets/hero-radio.png', frames: 8, fps: 6 }
// 화면에서는 원본 픽셀을 정수배로만 키웁니다. 자세한 규격은 assets/README.md 참고.
// ════════════════════════════════════════════════════════════════════
const ASSETS = {
  hero: null,   // 01 대표 작업 — 오후 네 시의 라디오 (160×90, 8f)
  rain: null,   // No.12 비 오는 정류장 (176×72, 8f)
  cat: null,    // No.11 창가의 고양이 (96×96, 8f)
  tape: null,   // No.10 B면 (112×112, 8f)
  night: null,  // No.09 새벽 세 시의 화면 (128×90, 12f)
  plant: null,  // No.08 물 주는 날 (64×96, 8f)
  items: null,  // No.06 상점 아이템 8종 (97×49, 8f)
  mug: null,    // 04 진행 과정 4단계 썸네일 (24×24, 8f)
};

// ════════════════════════════════════════════════════════════════════
// ── SPRITES ──
// 모든 작품이 함께 쓰는 아트 팔레트(문자 1개 = 색 1개)와 그리기 도구, 장면 함수.
// 규칙: 한 작품 안에서 논리 픽셀 1칸 = 같은 크기, 물체 외곽선은 먹색(K) 1px 자동,
//       빛은 왼쪽 위에서, 명암은 기본색 · 그늘 · 밝은 면 3단계.
// 아트 팔레트는 사이트 4색(W·K·v·O)에 차분한 작품용 색을 더한 것입니다(그림 안에서만 사용).
// ════════════════════════════════════════════════════════════════════
const PAL = {
  K: '#22231F', // 먹 (외곽선) — 사이트 본문색
  k: '#3B3C36', // 짙은 먹
  W: '#F5F3ED', // 크림 — 사이트 배경색
  w: '#E7E2D5', // 종이
  v: '#D8D6CF', // 회백 — 사이트 구분선색
  G: '#A29D90', // 따뜻한 회색
  g: '#6F6B62', // 짙은 회색
  O: '#D94D2B', // 주황 — 사이트 강조색
  o: '#A63A22', // 그늘 주황
  Y: '#D9A441', // 황토
  y: '#F0D59A', // 햇빛
  B: '#4E6470', // 청회색
  b: '#8FA6AC', // 옅은 청회색
  n: '#2B3540', // 밤
  S: '#7C8C69', // 잎
  s: '#566447', // 짙은 잎
  L: '#AEBB92', // 옅은 잎
  R: '#7A5236', // 나무
  r: '#A8754C', // 밝은 나무
  d: '#4F3626', // 짙은 나무
};
const PAL_NAMES = {
  K: '먹', k: '짙은 먹', W: '크림', w: '종이', v: '회백', G: '회색', g: '짙은 회색', O: '주황', o: '그늘 주황',
  Y: '황토', y: '햇빛', B: '청회색', b: '옅은 청회색', n: '밤', S: '잎', s: '짙은 잎', L: '옅은 잎',
  R: '나무', r: '밝은 나무', d: '짙은 나무',
};
const RGB = Object.fromEntries(Object.entries(PAL).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));

const TAU = Math.PI * 2;
const hash = n => { // 결정적 난수 0..1 (그림이 매번 같게)
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};

/** 픽셀 버퍼: 칸마다 팔레트 문자 하나. ox/oy 는 지역 좌표의 원점(외곽선 여백용). */
class Px {
  constructor(w, h, ox = 0, oy = 0) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.d = new Array(w * h).fill(''); }
  set(x, y, c) {
    x = Math.round(x) + this.ox; y = Math.round(y) + this.oy;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x = Math.round(x) + this.ox; y = Math.round(y) + this.oy;
    return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : '';
  }
  rect(c, x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  hl(c, x0, x1, y) { for (let x = x0; x <= x1; x++) this.set(x, y, c); return this; }
  vl(c, x, y0, y1) { for (let y = y0; y <= y1; y++) this.set(x, y, c); return this; }
  line(c, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /** 채운 원. cx/cy 에 .5 를 주면 짝수 지름 */
  disc(c, cx, cy, r, test = null) {
    const R = Math.ceil(r) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r + r * 0.6 && (!test || test(x, y))) this.set(x, y, c);
    }
    return this;
  }
  ell(c, cx, cy, rx, ry, test = null) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, c);
    }
    return this;
  }
  /** 문자열 배열 픽셀 맵. '.' 은 투명. map 으로 문자 치환 가능 */
  spr(rows, x, y, map = null, flip = false) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        this.set(flip ? x + row.length - 1 - i : x + i, y + j, map && map[ch] ? map[ch] : ch);
      }
    });
    return this;
  }
  /** 체커 디더 */
  dith(c, x, y, w, h, par = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((x + i + y + j) & 1) === par) this.set(x + i, y + j, c);
    return this;
  }
  /** 칠해진 칸에 붙은 빈 칸을 외곽선 색으로 */
  outline(c = 'K') {
    const { w, h, d } = this, add = [];
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[y * w + x] && d[y * w + x] !== c;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) add.push(y * w + x);
    }
    add.forEach(i => { d[i] = c; });
    return this;
  }
  /** 칠해진 칸을 각 지역 좌표와 함께 순회 */
  each(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + x];
      if (c) fn(x - this.ox, y - this.oy, c);
    }
  }
  blit(src, x, y) { src.each((lx, ly, c) => this.set(x + lx, y + ly, c)); return this; }
  /** src 모양만큼 그림자: 아래 색이 from 이면 to 로 */
  shadow(src, x, y, dx, dy, from, to) {
    src.each((lx, ly) => { if (this.get(x + lx + dx, y + ly + dy) === from) this.set(x + lx + dx, y + ly + dy, to); });
    return this;
  }
  /** 5×7 픽셀 글자 */
  text(str, x, y, c, scale = 1, font = FONT57) {
    let cx = x;
    for (const ch of str) {
      const g = font[ch] || font[' '];
      g.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '#') this.rect(c, cx + i * scale, y + j * scale, scale, scale);
      });
      cx += (g[0].length + 1) * scale;
    }
    return cx - x - scale;
  }
}

// ── 글꼴 픽셀 맵 ──────────────────────────────────────────────────────
const DIGITS57 = {
  0: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};
const FONT57 = {
  ...DIGITS57,
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
};
const FONT35 = {
  ' ': ['..', '..', '..', '..', '..'],
  ':': ['.', '#', '.', '#', '.'],
  0: ['###', '#.#', '#.#', '#.#', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
};

// 워드마크 "MONUN" — 7행, 획 두께 2칸
const WORDMARK = {
  M: ['##......##', '###....###', '####..####', '##.####.##', '##..##..##', '##......##', '##......##'],
  O: ['.######.', '########', '##....##', '##....##', '##....##', '########', '.######.'],
  N: ['##....##', '###...##', '####..##', '##.##.##', '##..####', '##...###', '##....##'],
  U: ['##....##', '##....##', '##....##', '##....##', '##....##', '########', '.######.'],
};

// ── 작은 픽셀 맵 ─────────────────────────────────────────────────────
const NOTE_A = ['..#..', '..##.', '..#.#', '..#..', '###..', '###..'];
const NOTE_B = ['..######', '..#....#', '..#....#', '..#....#', '###..###', '###..###'];
const KNOB = ['.KKK.', 'KKWKK', 'KKKKK', 'KKKKK', '.KKK.'];
const PERSON = [ // 우산 아래 사람, 정류장 쪽을 봄 (외곽선은 자동)
  '...kkk...',
  '..kkkkk..',
  '..kkkkW..',
  '...kkW...',
  '..GGGGG..',
  '.GGGGWGg.',
  '.GGGWWGg.',
  '.GGGGGGg.',
  '.GGGGGGg.',
  '.GGGGGGg.',
  '..GGGGg..',
  '..GGGGg..',
  '..GGgGg..',
  '...K.K...',
  '...K.K...',
  '...K.K...',
  '..KK.KK..',
];
const HEART_BIG = [
  '.OOOO...OOOO.',
  'OWWOOO.OOOOOO',
  'OWOOOOOOOOOOO',
  'OOOOOOOOOOOOo',
  'OOOOOOOOOOOOo',
  '.OOOOOOOOOOo.',
  '..OOOOOOOOo..',
  '...OOOOOOo...',
  '....OOOOo....',
  '.....OOo.....',
  '......o......',
];
const HEART_SMALL = [
  '.OOO...OOO.',
  'OWWOO.OOOOO',
  'OWOOOOOOOOo',
  'OOOOOOOOOOo',
  '.OOOOOOOOo.',
  '..OOOOOOo..',
  '...OOOOo...',
  '....OOo....',
  '.....o.....',
];

// ── 공용 물체 ────────────────────────────────────────────────────────
/** 머그잔 (몸통 11×12 + 손잡이). stage: 1 스케치 · 2 기본색 · 3 완성 */
function mugObj(stage = 3) {
  const o = new Px(16, 14, 1, 1);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 11; i++) o.set(i, j, 'W');
  o.set(0, 11, ''); o.set(10, 11, '');
  [[11, 3], [12, 3], [13, 4], [13, 5], [13, 6], [12, 7], [11, 7]].forEach(([x, y]) => o.set(x, y, 'W'));
  o.hl('d', 1, 9, 1);                    // 커피
  o.hl('O', 0, 10, 5); o.hl('O', 0, 10, 6); // 띠
  if (stage === 1) {                     // 연필 스케치: 외곽선만 회색으로
    o.outline('G');
    o.d = o.d.map(c => (c === 'G' ? 'G' : ''));
    return o;
  }
  if (stage >= 3) {
    for (let j = 2; j < 12; j++) { o.set(8, j, 'w'); o.set(9, j, 'w'); }
    o.set(8, 5, 'o'); o.set(9, 5, 'o'); o.set(8, 6, 'o'); o.set(9, 6, 'o');
    o.set(10, 5, 'o'); o.set(10, 6, 'o');
    o.set(13, 5, 'w'); o.set(13, 6, 'w');
    o.outline('K');
  }
  return o;
}

/** 머그잔 김: 세 갈래, 8프레임에 한 바퀴 */
function steam(P, x, y0, y1, f, c = 'W') {
  [0, 3, 6].forEach((dx, i) => {
    for (let y = y0 + i; y <= y1; y++) {
      const t = y + f * 2 + i * 5;
      if (((t % 8) + 8) % 8 >= 5) continue;
      const wob = Math.round(Math.sin((t / 16) * TAU) * 1.2);
      P.set(x + dx + wob, y, c);
    }
  });
}

/** 산세베리아 잎 한 장 */
function blade(P, bx, baseY, h, lean, sway) {
  const o = new Px(28, h + 4, 14, h + 1);
  for (let i = 0; i < h; i++) {
    const t = i / (h - 1);
    const cx = (lean + sway) * t * t;
    const w = Math.max(1, Math.round(4 - 3.3 * t));
    const x0 = Math.round(cx - (w - 1) / 2);
    for (let k = 0; k < w; k++) o.set(x0 + k, -i, k === w - 1 && w >= 3 ? 's' : 'S');
    if (i % 6 === 4 && w >= 2) for (let k = 0; k < w - 1; k++) o.set(x0 + k, -i, 's');
  }
  o.outline();
  P.blit(o, bx, baseY);
}

/** 렌즈 모양 잎 (base 에서 angle 방향으로) */
function leaf(P, bx, by, angle, len, half, c1 = 'S', c2 = 's', vein = 'L') {
  const R = len + 2, o = new Px(R * 2 + 3, R * 2 + 3, R + 1, R + 1);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const u = x * ca + y * sa, v = -x * sa + y * ca;
    if (u < 0 || u > len) continue;
    const lim = half * Math.pow(Math.sin(Math.PI * u / len), 0.75);
    if (Math.abs(v) > lim) continue;
    let c = v < 0 ? c1 : c2;
    if (Math.abs(v) < 0.55 && u > 2 && u < len - 2) c = vein;
    o.set(x, y, c);
  }
  o.outline();
  P.blit(o, bx, by);
}

// ── 장면: 01 오후 네 시의 라디오 ───────────────────────────────────────
function drawHero(P, f) {
  const W = P.w, sx = (W - 160) >> 1;

  // 벽과 비스듬히 든 햇빛 (창살 그림자로 네 칸)
  P.rect('w', 0, 0, W, 62);
  for (let y = 4; y <= 61; y++) {
    const sh = Math.floor((y - 4) / 3), x0 = sx + 58 + sh, x1 = sx + 122 + sh;
    for (let x = x0; x <= x1; x++) {
      const mx = x - x0;
      if (mx === 31 || mx === 32 || y === 27 || y === 28) continue;
      if ((x === x0 || x === x1 || y === 4) && (x + y) % 2) continue;
      P.set(x, y, 'y');
    }
  }

  // 벽에 걸린 작은 액자
  const fr = new Px(18, 22, 1, 1);
  fr.rect('r', 0, 0, 16, 20).rect('W', 2, 2, 12, 16).rect('y', 3, 3, 10, 14);
  fr.disc('O', 9.5, 7.5, 2);
  for (let x = 3; x <= 12; x++) { const top = 12 + Math.round(Math.sin((x - 3) / 9 * Math.PI) * -2); fr.vl('S', x, top, 16); }
  fr.outline();
  P.blit(fr, sx + 8, 14);

  // 벽시계 — 네 시
  const clk = new Px(17, 17, 8, 8);
  clk.disc('W', 0, 0, 6.6);
  clk.set(0, -5, 'w'); clk.set(5, 0, 'w'); clk.set(0, 5, 'w'); clk.set(-5, 0, 'w');
  const a = (f / 8) * TAU;
  clk.line('O', 0, 0, Math.round(Math.sin(a) * 4), Math.round(-Math.cos(a) * 4));
  clk.vl('K', 0, -4, 0);
  clk.set(1, 0, 'K'); clk.set(2, 1, 'K'); clk.set(3, 1, 'K');
  clk.outline();
  P.blit(clk, sx + 145, 19);

  // 책상
  P.rect('R', 0, 62, W, 1);
  P.rect('r', 0, 63, W, 7);
  P.rect('R', 0, 70, W, 1);
  P.rect('r', 0, 71, W, 3);
  P.rect('d', 0, 74, W, 1);
  P.rect('R', 0, 75, W, 15);
  const dx0 = sx + 50, dx1 = sx + 109;
  P.hl('d', dx0, dx1, 78); P.hl('d', dx0, dx1, 87); P.vl('d', dx0, 78, 87); P.vl('d', dx1, 78, 87);
  P.hl('y', sx + 77, sx + 82, 82);
  [[sx + 14, 80], [sx + 30, 84], [sx + 124, 79], [sx + 140, 85]].forEach(([x, y]) => P.hl('d', x, x + 5, y));

  // 라디오 몸체
  const bx = sx + 62, by = 40, bw = 46, bh = 27;
  const radio = new Px(bw + 2, bh + 2, 1, 1);
  radio.rect('O', 0, 0, bw, bh);
  [[0, 0], [bw - 1, 0], [0, bh - 1], [bw - 1, bh - 1]].forEach(([x, y]) => radio.set(x, y, ''));
  radio.hl('y', 1, bw - 6, 0);
  radio.rect('o', bw - 3, 1, 3, bh - 2);
  radio.hl('o', 1, bw - 2, bh - 1);
  radio.rect('o', 3, 4, 23, 19).rect('W', 4, 5, 21, 17);
  for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) radio.set(5 + i * 2, 6 + j * 2, 'K');
  radio.rect('o', 29, 4, 13, 9).rect('W', 30, 5, 11, 7);
  for (let i = 0; i < 5; i++) radio.set(31 + i * 2, 5, 'K');
  radio.set(31, 6, 'K'); radio.set(35, 6, 'K'); radio.set(39, 6, 'K');
  radio.vl('o', 34, 5, 11);
  radio.spr(KNOB, 30, 15).spr(KNOB, 37, 15);
  radio.hl('o', 30, 41, 22);
  radio.outline();

  const pot = new Px(18, 17, 1, 1);
  for (let j = 0; j < 15; j++) {
    const inset = j < 3 ? 0 : 1 + Math.floor((j - 3) / 6);
    for (let i = inset; i < 16 - inset; i++) pot.set(i, j, 'W');
  }
  pot.hl('d', 2, 13, 0);
  pot.hl('w', 1, 14, 3);
  pot.each((x, y, c) => { if (c === 'W' && x >= 12 && y >= 3) pot.set(x, y, 'w'); });
  pot.vl('w', 15, 0, 2);
  pot.each((x, y, c) => { if ((y === 7 || y === 8) && c) pot.set(x, y, 'B'); });
  pot.outline();

  const mug = mugObj(3);

  const books = [
    { x: sx + 131, y: 61, w: 25, h: 6, c: 'B', b: 'y' },
    { x: sx + 133, y: 56, w: 21, h: 5, c: 'S', b: 'y' },
    { x: sx + 132, y: 52, w: 18, h: 4, c: 'y', b: 'o' },
  ].map(bk => {
    const o = new Px(bk.w + 2, bk.h + 2, 1, 1);
    o.rect(bk.c, 0, 0, bk.w, bk.h).vl(bk.b, 3, 0, bk.h - 1).vl(bk.b, bk.w - 4, 0, bk.h - 1);
    o.outline();
    return { ...bk, o };
  });

  // 그림자 — 햇빛 위에 물체 모양으로, 책상 위에 짧게
  P.shadow(radio, bx, by, 6, 2, 'y', 'w');
  P.shadow(mug, sx + 117, 55, 5, 2, 'y', 'w');
  P.rect('R', bx + 3, 67, bw + 4, 1); P.dith('R', bx + bw + 7, 67, 3, 1, 1);
  P.rect('R', sx + 30, 67, 18, 1);
  P.rect('R', sx + 119, 67, 13, 1);
  P.rect('R', sx + 133, 67, 25, 1);

  // 화분 — 잎은 화분 뒤에서 솟음
  const SW = [0, 0, 1, 1, 1, 0, 0, -1];
  const px0 = sx + 28;
  blade(P, px0 + 4, 53, 22, -6, SW[(f + 2) % 8]);
  blade(P, px0 + 12, 53, 19, 7, SW[(f + 5) % 8]);
  blade(P, px0 + 7, 53, 33, -2, SW[f % 8]);
  blade(P, px0 + 10, 53, 28, 3, SW[(f + 3) % 8]);
  P.blit(pot, px0, 52);

  // 라디오 손잡이 · 안테나
  P.rect('K', bx + 6, by - 6, 2, 6);
  P.rect('K', bx + bw - 8, by - 6, 2, 6);
  P.rect('K', bx + 8, by - 7, bw - 16, 2);
  P.line('K', bx + bw - 4, by - 1, bx + bw + 6, by - 21);
  P.rect('K', bx + bw + 6, by - 23, 2, 2);
  P.blit(radio, bx, by);

  P.blit(mug, sx + 117, 55);
  books.forEach(bk => P.blit(bk.o, bk.x, bk.y));

  // 움직이는 것들: 김, 음표, 먼지
  steam(P, sx + 119, 38, 53, f);
  [[NOTE_A, 0], [NOTE_B, 3], [NOTE_A, 5.5]].forEach(([spr, ph], i) => {
    const p = (f + ph) % 8;
    if (p > 6.5) return;
    const y = by - 12 - Math.round(p * 2.6);
    const x = bx + 1 + i * 8 - Math.round(p * 1.2) + Math.round(Math.sin(p) * 1);
    P.spr(spr, x, y, { '#': 'K' });
  });
}

// ── 장면: No.12 비 오는 정류장 ─────────────────────────────────────────
function drawRain(P, f) {
  const W = P.w, H = P.h, sx = (W - 176) >> 1, cx = W >> 1;

  // 하늘: 위는 밤, 아래는 도시 불빛에 옅어진 청회색
  P.rect('n', 0, 0, W, 48);
  P.dith('B', 0, 16, W, 1, 0);
  P.dith('B', 0, 17, W, 1, 1);
  P.rect('B', 0, 18, W, 30);
  P.dith('n', 0, 18, W, 1, 0);

  // 건물: 먼 층(밤색 실루엣) · 가까운 층(창문 불빛)
  const layers = [{ c: 'n', minH: 16, varH: 14, seed: 11 }, { c: 'k', minH: 8, varH: 18, seed: 47 }];
  for (const layer of layers) {
    let x = -cx - 12, i = 0;
    while (x < cx + 12) {
      const r1 = hash(layer.seed + i * 3), r2 = hash(layer.seed + i * 3 + 1), r3 = hash(layer.seed + i * 3 + 2);
      const w = 8 + Math.floor(r1 * 14), h = layer.minH + Math.floor(r2 * layer.varH);
      const X = cx + x, top = 48 - h;
      P.rect(layer.c, X, top, w, h);
      if (r3 > 0.62) P.rect(layer.c, X + 2, top - 3, 2, 3);
      if (layer.c === 'k') {
        for (let wy = top + 3; wy < 46; wy += 4) for (let wx = X + 2; wx < X + w - 2; wx += 3) {
          const hv = hash(wx * 131 + wy * 17);
          const blink = hv < 0.035 && f >= 4;
          if ((hv < 0.24) !== blink) P.rect('y', wx, wy, 1, 2);
        }
      } else {
        for (let wy = top + 4; wy < 46; wy += 5) for (let wx = X + 2; wx < X + w - 1; wx += 4) if (hash(wx * 7 + wy * 3) < 0.14) P.set(wx, wy, 'B');
      }
      x += w + (r3 < 0.25 ? 2 : 0);
      i++;
    }
  }

  // 인도 · 연석 · 젖은 도로
  P.rect('g', 0, 48, W, 5);
  P.hl('G', 0, W - 1, 53);
  P.rect('k', 0, 54, W, 1);
  P.rect('n', 0, 55, W, H - 55);

  // 정류장: 뒤 유리(불 켜진 창만 비침), 기둥, 지붕, 벤치, 광고판
  const S = x => sx + x;
  for (let y = 24; y <= 46; y++) for (let x = S(94); x <= S(149); x++) if (P.get(x, y) !== 'y') P.set(x, y, 'B');
  P.line('b', S(98), 44, S(112), 26); P.line('b', S(101), 44, S(115), 26); P.line('b', S(118), 40, S(124), 32);
  P.hl('g', S(94), S(149), 47);
  P.rect('G', S(92), 22, 2, 31);
  P.rect('G', S(150), 22, 2, 31);
  P.rect('G', S(88), 19, 67, 2);
  P.rect('g', S(88), 21, 67, 1);
  P.hl('K', S(88), S(154), 18);
  P.rect('g', S(100), 43, 26, 2);
  P.vl('K', S(102), 45, 52); P.vl('K', S(123), 45, 52);
  const box = new Px(16, 24, 1, 1);
  box.rect('y', 0, 0, 14, 22).disc('B', 6.5, 6, 3).disc('y', 7.5, 5, 1.6);
  [12, 14, 16].forEach((y, i) => box.hl('g', 2, 11 - i * 2, y));
  box.outline();
  P.blit(box, S(134), 25);
  // 정류장 표지
  P.vl('G', S(80), 20, 52);
  const sign = new Px(11, 11, 5, 5);
  sign.disc('W', 0, 0, 3.9).hl('B', -3, 3, -1).hl('B', -3, 3, 0).hl('B', -3, 3, 1);
  sign.outline();
  P.blit(sign, S(80), 16);

  // 젖은 도로에 번진 불빛 (가로 물결 줄)
  const reflect = (x0, x1, y0, y1, c, seed) => {
    for (let y = y0; y <= y1; y += 2) {
      const span = x1 - x0, shrink = Math.floor((y - y0) / 3);
      for (let x = x0 + shrink; x <= x1 - shrink; x++) {
        const v = hash(seed + x * 13 + y * 7 + ((f >> 1) % 2) * 101);
        if (v < 0.55 - (y - y0) * 0.03) P.set(x, y, c);
      }
      if (span < 0) break;
    }
  };
  reflect(S(135), S(147), 56, 69, 'y', 3);
  reflect(S(50), S(66), 56, 63, 'o', 9);
  reflect(S(92), S(93), 56, 61, 'G', 5); reflect(S(150), S(151), 56, 61, 'G', 6);

  // 웅덩이와 퍼지는 물결
  [[S(24), 64, 11, 0], [S(112), 68, 13, 4]].forEach(([x, y, rx, ph]) => {
    P.ell('B', x, y, rx, 2.2);
    P.hl('b', x - rx + 4, x - 2, y - 1);
    const r = ((f + ph) % 8) / 8;
    const rr = 2 + r * (rx - 3);
    for (let a = 0; a < TAU; a += 0.08) P.set(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.22, r < 0.85 ? 'b' : 'B');
  });

  // 우산 쓴 사람
  const ux = S(48), uy = 25;
  const um = new Px(23, 30, 2, 1);
  um.ell('O', 9, 6, 9.4, 5.6, (x, y) => y <= 6);
  um.each((x, y, c) => { if (c === 'O' && x > 12) um.set(x, y, 'o'); });
  for (let x = 0; x <= 18; x += 3) um.set(x, 6, '');
  [3, 9, 15].forEach(x => um.line('o', 9, 1, x, 5));
  um.set(9, 0, 'K'); um.set(9, -1, 'K');
  um.spr(PERSON, 5, 7);
  um.vl('K', 9, 7, 13);
  um.outline();
  P.blit(um, ux, uy);

  // 비 — 우산 아래는 마른 자리
  const dryX0 = ux - 1, dryX1 = ux + 19, dryY = uy;
  for (let i = 0; i < Math.round(W * 0.4); i++) {
    const x0 = Math.floor(hash(i * 5 + 1) * (W + 24)), y0 = Math.floor(hash(i * 5 + 2) * H);
    const y = (y0 + f * 9) % H, x = ((x0 - Math.floor(y / 3)) % W + W) % W;
    if (x >= dryX0 && x <= dryX1 && y >= dryY - 1 && y <= 53) continue;
    P.set(x, y, 'b'); P.set(x, y + 1, 'b'); if ((i & 1) === 0) P.set(x - 1, y + 2, 'b');
  }
}

// ── 장면: No.11 창가의 고양이 ──────────────────────────────────────────
const CAT = [ // 앉아 있는 뒷모습, 22×28 (꼬리는 따로 그림)
  '...#.........#........',
  '...##.......##........',
  '...###.....###........',
  '...####...####........',
  '...###########........',
  '..#############.......',
  '..#############.......',
  '..#############.......',
  '..#############.......',
  '...###########........',
  '....#########.........',
  '.....#######..........',
  '....#########.........',
  '...###########........',
  '..#############.......',
  '..#############.......',
  '.###############......',
  '.###############......',
  '.################.....',
  '#################.....',
  '#################.....',
  '##################....',
  '##################....',
  '##################....',
  '##################....',
  '#################.....',
  '.################.....',
  '..##############......',
];
function drawCat(P, f) {
  const W = P.w, H = P.h, cx = W >> 1;
  P.rect('S', 0, 0, W, H);
  P.dith('s', 0, 84, W, 2, 0);
  P.rect('s', 0, 86, W, H - 86);

  // 창 (위쪽 작은 창 세 칸 + 큰 유리)
  const gx0 = cx - 27, gx1 = cx + 26, gy0 = 10, gy1 = 66;
  const ww = gx1 - gx0 + 1, wh = gy1 - gy0 + 1;
  const win = new Px(ww + 8, wh + 8, 4, 4);
  win.rect('W', -3, -3, ww + 6, wh + 4);
  win.rect('n', 0, 0, ww, wh);
  win.dith('B', 0, 43, ww, 1, 0);
  win.rect('B', 0, 44, ww, wh - 44);
  // 먼 지붕들
  [[0, 7, 49], [7, 6, 46], [13, 9, 50], [22, 5, 47], [27, 10, 49], [37, 6, 45], [43, 11, 48]].forEach(([x, w, top], i) => {
    win.rect('k', x, top, w, wh - top);
    if (i % 2 === 0) win.set(x + 2, top + 3, 'y');
    if (i === 3) win.rect('k', x + 1, top - 3, 2, 3);
  });
  // 달
  const mx = 34, my = 31, inPane = (x, y) => y >= 14;
  win.disc('W', mx, my, 11.4, inPane);
  win.disc('w', mx + 3, my - 4, 2.4, inPane);
  win.disc('w', mx + 5, my + 4, 1.6, inPane);
  win.disc('w', mx - 2, my + 6, 1.2, inPane);
  // 별 (반짝임)
  [[6, 4], [25, 6], [45, 3], [8, 23], [4, 36], [50, 24]].forEach(([x, y], i) => win.set(x, y, (f + i) % 4 !== 0 ? 'W' : 'B'));
  if (f % 4 < 2) { win.set(16, 19, 'B'); win.set(18, 19, 'B'); win.set(17, 18, 'B'); win.set(17, 20, 'B'); }
  win.set(17, 19, 'W');
  // 창살
  win.rect('W', 0, 11, ww, 2);
  win.hl('w', 0, ww - 1, 13);
  win.vl('W', Math.floor(ww / 3), 0, 10); win.vl('W', Math.floor(ww * 2 / 3), 0, 10);
  win.vl('w', ww - 1, 14, wh - 1);
  win.outline();
  P.blit(win, gx0, gy0);

  // 커튼 봉 · 커튼 (왼쪽만, 묶어 둠)
  const rod = new Px(ww + 22, 6, 1, 1);
  rod.rect('R', 0, 1, ww + 20, 2).rect('r', 0, 0, 3, 4).rect('r', ww + 17, 0, 3, 4);
  rod.outline();
  P.blit(rod, gx0 - 10, 4);
  const cur = new Px(20, 64, 2, 1);
  for (let y = 0; y < 59; y++) {
    const wdt = y < 38 ? 14 - Math.floor((y / 38) * 7) : 7 + Math.floor(((y - 38) / 21) * 5);
    for (let x = 0; x < wdt; x++) cur.set(x, y, x % 4 === 2 && wdt > 6 ? 'v' : 'w');
    cur.set(wdt - 1, y, 'v');
  }
  cur.rect('R', 0, 38, 8, 2);
  cur.outline();
  P.blit(cur, gx0 - 8, 7);

  // 창턱
  const sill = new Px(ww + 16, 8, 1, 1);
  sill.rect('r', 0, 0, ww + 14, 2).rect('R', 0, 2, ww + 14, 3).hl('W', 0, ww + 13, 0);
  sill.outline();
  P.blit(sill, gx0 - 7, 67);
  P.dith('s', gx0 - 6, 74, ww + 12, 2, 1);

  // 작은 화분
  const pot = new Px(11, 10, 1, 1);
  pot.rect('W', 0, 0, 9, 8).set(0, 7, ''); pot.set(8, 7, '');
  pot.hl('k', 1, 7, 0); pot.vl('v', 7, 1, 7); pot.vl('v', 6, 1, 7);
  pot.outline();
  const ppx = gx1 - 12;
  leaf(P, ppx + 4, 59, -2.2, 9, 3, 'S', 's', 'L');
  leaf(P, ppx + 5, 59, -1.3, 10, 3, 'S', 's', 'L');
  leaf(P, ppx + 5, 60, -0.4, 8, 2.6, 'S', 's', 'L');
  P.blit(pot, ppx, 59);

  // 고양이 — 먹색 실루엣, 달 쪽 가장자리에만 빛
  const cat = new Px(32, 44, 2, 2);
  const twitch = f === 5 || f === 6;
  cat.spr(CAT, 0, 0, { '#': 'K' });
  if (twitch) { cat.set(13, 0, ''); cat.set(12, 1, ''); cat.set(14, 2, 'K'); }
  // 꼬리: 창턱 앞으로 늘어뜨린 채 끝만 흔들림
  const sway = [0, 1, 2, 2, 1, 0, -1, -1][f % 8];
  const tail = [[17, 23], [18, 23], [19, 24], [20, 25], [21, 26], [21, 27], [21, 28], [21, 29], [21, 30], [21, 31]];
  tail.forEach(([x, y]) => cat.hl('K', x - 1, x + 1, y));
  const tip = [[21 + Math.round(sway / 2), 32], [21 + sway, 33], [22 + sway, 34], [23 + sway, 34]];
  tip.forEach(([x, y]) => cat.hl('K', x - 1, x + 1, y));
  cat.hl('K', 23 + sway, 25 + sway, 33);
  const rim = [];
  cat.each((x, y) => { if (y < 19 && x > 6 && (!cat.get(x + 1, y) || (!cat.get(x, y - 1) && x > 9))) rim.push([x, y]); });
  rim.forEach(([x, y]) => cat.set(x, y, 'B'));
  cat.outline();
  P.blit(cat, cx - 12, 40);
}

// ── 장면: No.10 B면 (앨범 커버) ───────────────────────────────────────
function drawTape(P, f) {
  P.rect('O', 0, 0, 112, 112);
  P.text('SIDE B', 10, 10, 'W', 2);
  P.text('LOW TIDE', 10, 30, 'K');
  P.text('EP', 89, 30, 'K');

  // 물결 (8프레임에 한 파장)
  [97, 102, 107].forEach((by, i) => {
    for (let x = 0; x < 112; x++) {
      const yy = by + Math.round(Math.sin(((x + f * 2 + i * 5) / 16) * TAU) * 1.2);
      P.set(x, yy, i === 1 ? 'W' : 'o'); P.set(x, yy + 1, 'o');
    }
  });

  const cas = new Px(82, 52, 1, 1);
  cas.rect('W', 0, 0, 80, 50);
  [[0, 0], [1, 0], [0, 1], [79, 0], [78, 0], [79, 1], [0, 49], [1, 49], [0, 48], [79, 49], [78, 49], [79, 48]].forEach(([x, y]) => cas.set(x, y, ''));
  cas.rect('w', 78, 2, 2, 46).rect('w', 2, 48, 76, 2);
  [[3, 3], [75, 3], [3, 45], [75, 45], [38, 45]].forEach(([x, y]) => cas.rect('G', x, y, 2, 2));
  // 라벨
  cas.rect('y', 6, 4, 68, 27).rect('O', 6, 6, 68, 3).hl('o', 6, 73, 9);
  cas.text('B', 9, 12, 'K');
  cas.hl('v', 17, 66, 13); cas.hl('v', 9, 66, 29);
  // 창과 릴
  cas.rect('k', 20, 15, 40, 12);
  [[20, 15], [59, 15], [20, 26], [59, 26]].forEach(([x, y]) => cas.set(x, y, 'y'));
  const inWin = (x, y) => x >= 21 && x <= 58 && y >= 16 && y <= 25;
  cas.disc('R', 29, 20.5, 8.5, inWin);
  cas.disc('R', 50, 20.5, 5.5, inWin);
  cas.hl('R', 29, 50, 25);
  const th = (f / 8) * (TAU / 3);
  [[29, 20.5], [50, 20.5]].forEach(([hx, hy]) => {
    cas.disc('W', hx, hy, 2.3);
    cas.disc('K', hx, hy, 0.8);
    for (let k = 0; k < 6; k++) { const an = th + k * TAU / 6; cas.set(hx + Math.cos(an) * 3.6, hy + Math.sin(an) * 3.6, 'W'); }
  });
  // 아래 사다리꼴
  for (let y = 35; y <= 47; y++) { const ins = Math.floor((y - 35) / 3); cas.hl('w', 14 - ins, 65 + ins, y); }
  cas.hl('v', 14, 65, 35);
  cas.disc('K', 23.5, 41.5, 1.5).disc('K', 56.5, 41.5, 1.5);
  cas.rect('K', 33, 42, 2, 2).rect('K', 45, 42, 2, 2);
  cas.outline();
  P.blit(cas, 16, 44);
  P.text('10', 89, 10, 'o');
}

// ── 장면: No.09 새벽 세 시의 화면 ──────────────────────────────────────
function drawNight(P, f) {
  const W = P.w, H = P.h, sx = (W - 128) >> 1, S = x => sx + x;
  P.rect('n', 0, 0, W, 66);
  for (let x = (S(0) % 6 + 6) % 6; x < W; x += 6) P.dith('k', x, 0, 1, 66, 0);

  // 벽 메모
  [[S(88), 22, 'y'], [S(97), 26, 'O'], [S(90), 33, 'y']].forEach(([x, y, c], i) => {
    const o = new Px(9, 9, 1, 1);
    o.rect(c, 0, 0, 7, 7);
    o.hl(c === 'O' ? 'W' : 'g', 1, 4 + (i % 2), 2); o.hl(c === 'O' ? 'W' : 'g', 1, 3, 4);
    o.outline();
    P.blit(o, x, y);
  });
  // 액자
  const ph = new Px(16, 14, 1, 1);
  ph.rect('G', 0, 0, 14, 12).rect('B', 1, 1, 12, 10).disc('W', 9, 4, 1.5).rect('s', 1, 8, 12, 3);
  ph.outline();
  P.blit(ph, S(14), 20);

  // 책상과 화면 빛
  P.rect('k', 0, 66, W, 6);
  const lx = S(58);
  for (let y = 66; y < 72; y++) for (let x = 0; x < W; x++) {
    const d = Math.abs(x - lx) / 34 + (y - 66) / 14;
    if (d < 0.75 || (d < 1 && (x + y) % 2 === 0)) P.set(x, y, 'B');
  }
  P.hl('G', 0, W - 1, 72);
  P.rect('K', 0, 73, W, H - 73);

  // 플로피 디스크 더미
  [[S(14), 63, 'B'], [S(15), 60, 'O'], [S(13), 57, 'B']].forEach(([x, y, c]) => {
    const o = new Px(16, 5, 1, 1);
    o.rect(c, 0, 0, 14, 3).hl('W', 4, 9, 1);
    o.outline();
    P.blit(o, x, y);
  });

  // 컴퓨터
  const cx0 = S(40), cy0 = 24;
  const pc = new Px(40, 44, 1, 1);
  pc.rect('w', 0, 0, 38, 42);
  pc.set(0, 0, ''); pc.set(37, 0, '');
  pc.rect('v', 34, 1, 4, 41).hl('v', 0, 37, 41);
  pc.rect('G', 4, 4, 30, 24).rect('s', 5, 5, 28, 22);
  const scr = (x, y, c) => pc.set(5 + x, 5 + y, c);
  // 시계 3:00 (콜론 깜빡임)
  const clockStr = f % 6 < 3 ? '3:00' : '3 00';
  let tx = 14;
  for (const ch of clockStr) { FONT35[ch].forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') scr(tx + i, 1 + j, 'L'); }); tx += FONT35[ch][0].length + 1; }
  scr(1, 2, 'L'); scr(2, 2, 'L'); scr(3, 2, 'L'); scr(1, 4, 'L'); scr(2, 4, 'L');
  for (let x = 0; x < 28; x += 2) scr(x, 7, 'L');
  const lines = ['fn loop {', '  draw(f)', '  wait 8', '}', ''];
  lines.forEach((ln, j) => { for (let i = 0; i < ln.length && i < 26; i++) if (ln[i] !== ' ') scr(1 + i, 9 + j * 2, 'L'); });
  const typed = 'save frame';
  const n = Math.min(f, typed.length);
  for (let i = 0; i < n; i++) if (typed[i] !== ' ') scr(1 + i, 17, 'L');
  if (f < typed.length || f % 4 < 2) { scr(2 + n, 16, 'L'); scr(2 + n, 17, 'L'); scr(3 + n, 16, 'L'); scr(3 + n, 17, 'L'); }
  // 턱 부분
  pc.hl('K', 20, 31, 33); pc.rect('G', 6, 33, 3, 2);
  pc.outline();
  P.blit(pc, cx0, cy0);

  // 키보드 · 마우스
  const kb = new Px(46, 6, 1, 1);
  kb.rect('w', 0, 0, 44, 4).hl('v', 0, 43, 3);
  for (let x = 2; x < 42; x += 2) { kb.set(x, 1, 'G'); kb.set(x + 1, 2, 'G'); }
  kb.outline();
  P.blit(kb, S(37), 67);
  const ms = new Px(7, 6, 1, 1); ms.rect('w', 0, 0, 5, 4).set(0, 0, ''); ms.set(4, 0, ''); ms.vl('v', 4, 1, 3); ms.outline();
  P.blit(ms, S(88), 67);

  // 식은 커피
  const mug = mugObj(3);
  P.blit(mug, S(104), 56);
}

// ── 장면: No.08 물 주는 날 ─────────────────────────────────────────────
function drawPlant(P, f) {
  P.rect('v', 0, 0, 64, 70);
  P.dith('w', 0, 68, 64, 2, 0);
  P.rect('w', 0, 70, 64, 26);
  for (let y = 86; y <= 91; y++) for (let x = 14; x <= 54; x++) {
    const d = ((x - 36) / 20) ** 2 + ((y - 88.5) / 3) ** 2;
    if (d < 0.6 || (d < 1 && (x + y) % 2 === 0)) P.set(x, y, 'v');
  }

  // 줄기와 잎
  const leaves = [
    [22, 42, -2.55, 15, 5.5], [34, 32, -1.7, 18, 6.5], [40, 42, -0.55, 15, 5.5],
    [22, 54, Math.PI, 13, 4.5], [42, 54, -0.05, 13, 4.5], [31, 47, -1.35, 12, 4.5],
  ];
  leaves.forEach(([x, y], i) => {
    const s = Math.round(Math.sin(((f + i * 3) / 8) * TAU) * 1);
    P.line('s', 32, 62, x + (i < 3 ? s : 0), y);
  });
  leaves.forEach(([x, y, a, len, half], i) => {
    const sw = Math.sin(((f + i * 3) / 8) * TAU);
    leaf(P, x + (i < 3 ? Math.round(sw) : 0), y, a + sw * 0.06, len, half);
  });

  // 화분 (테라코타)
  const pot = new Px(30, 28, 1, 1);
  pot.rect('O', 0, 0, 28, 5);
  pot.hl('d', 2, 25, 0);
  pot.hl('o', 0, 27, 4);
  for (let j = 5; j < 26; j++) { const ins = 2 + Math.floor((j - 5) / 7); pot.hl('O', ins, 27 - ins, j); pot.hl('o', 23 - ins + 2, 27 - ins, j); pot.set(ins + 1, j, 'w'); }
  pot.hl('o', 2, 25, 5);
  pot.rect('o', 24, 0, 4, 4);
  pot.outline();
  P.blit(pot, 18, 62);

  // 물뿌리개 (오른쪽 위에서 들어옴)
  const can = new Px(40, 30, 2, 2);
  can.line('B', 0, 10, 14, 2).line('B', 0, 11, 14, 3).line('B', 1, 11, 15, 3);
  can.rect('b', -2, 9, 4, 4);
  can.rect('B', 14, 0, 20, 14).hl('b', 15, 33, 1).vl('b', 15, 1, 12);
  can.rect('B', 20, -2, 8, 2);
  can.outline();
  P.blit(can, 30, 14);

  // 물방울 — 여덟 칸 간격, 한 프레임에 두 칸
  for (let k = 0; k < 6; k++) {
    for (const dx of [0, 3]) {
      const y = 30 + ((k * 8 + f * 2 + dx) % 48);
      if (y > 60) continue;
      const x = 29 + dx - Math.floor((y - 30) / 16);
      P.set(x, y, 'b'); P.set(x, y + 1, 'b');
    }
  }
  if (f % 4 === 0) { P.set(26, 61, 'b'); P.set(31, 61, 'b'); }
  if (f % 4 === 1) { P.set(25, 60, 'b'); P.set(32, 60, 'b'); }
}

// ── 장면: No.06 상점 아이템 8종 ────────────────────────────────────────
const ICONS = {
  coin(o, f) {
    const rx = [5.6, 4, 1.2, 4][f % 4];
    o.ell('Y', 7.5, 7.5, rx, 6.2);
    if (rx > 3) {
      o.ell('o', 7.5, 7.5, rx - 1.8, 4.2);
      o.ell('Y', 7.5, 7.5, rx - 2.8, 3.2);
      o.each((x, y, c) => { if (c === 'Y' && x < 7.5 - rx + 1.5) o.set(x, y, 'y'); });
    } else o.each((x, y, c) => { if (c === 'Y' && x > 7) o.set(x, y, 'o'); });
  },
  heart(o, f) {
    if (f % 4 === 0) o.spr(HEART_BIG, 1, 2); else o.spr(HEART_SMALL, 2, 3);
  },
  potion(o, f) {
    o.disc('b', 7.5, 9.5, 5.3);
    o.rect('b', 6, 2, 4, 4);
    o.rect('Y', 5, 0, 6, 2);
    o.each((x, y, c) => { if (c === 'b' && y >= 8) o.set(x, y, x > 9 ? 's' : 'S'); });
    o.set(4, 7, 'W'); o.set(4, 8, 'W'); o.set(5, 6, 'W');
    [[6, 0], [9, 3]].forEach(([x, ph]) => { const y = 14 - ((f + ph) % 6); if (y >= 9) o.set(x, y, 'W'); });
  },
  key(o) {
    o.disc('Y', 4.5, 4.5, 3.6);
    o.disc('', 4.5, 4.5, 1.2);
    for (let t = 0; t < 8; t++) { o.set(6 + t, 6 + t, 'Y'); o.set(7 + t, 6 + t, 'Y'); o.set(6 + t, 7 + t, 'o'); }
    o.set(10, 12, 'Y'); o.set(9, 13, 'Y'); o.set(12, 14, 'Y'); o.set(11, 15, 'Y');
    o.set(2, 3, 'y'); o.set(3, 2, 'y'); o.set(2, 4, 'y');
  },
  apple(o) {
    o.disc('O', 7.5, 9, 5.6);
    o.set(7, 3, ''); o.set(8, 3, '');
    o.each((x, y, c) => { if (c === 'O' && (x - 4) + (y - 6) > 8) o.set(x, y, 'o'); });
    o.set(4, 7, 'W'); o.set(4, 8, 'W'); o.set(5, 6, 'W');
    o.vl('s', 8, 1, 3); o.rect('S', 9, 1, 3, 2); o.set(12, 1, 'S');
  },
  mushroom(o) {
    o.ell('O', 7.5, 7, 6.8, 5.6, (x, y) => y <= 7);
    o.hl('o', 2, 13, 7);
    [[5, 3], [6, 3], [10, 4], [11, 4], [8, 1], [3, 6]].forEach(([x, y]) => o.set(x, y, 'W'));
    o.rect('w', 5, 8, 6, 6); o.vl('v', 10, 8, 13); o.hl('v', 5, 10, 8);
  },
  gem(o, f) {
    for (let y = 3; y <= 6; y++) o.hl('B', 4 - (y - 3), 11 + (y - 3), y);
    for (let y = 7; y <= 13; y++) o.hl('B', 1 + (y - 7), 14 - (y - 7), y);
    o.hl('b', 4, 11, 3); o.hl('b', 1, 14, 6);
    for (let y = 7; y <= 13; y++) o.set(1 + (y - 7) + 1, y, 'b');
    o.line('b', 7, 7, 7, 12); o.set(5, 4, 'W'); o.set(4, 5, 'W');
    const st = [0, 0, 2, 1, 0, 0, 0, 0][f % 8];
    if (st === 2) { o.set(13, 0, 'W'); o.set(12, 1, 'W'); o.set(13, 1, 'W'); o.set(14, 1, 'W'); o.set(13, 2, 'W'); }
    if (st === 1) o.set(13, 1, 'W');
  },
  letter(o) {
    o.rect('W', 0, 3, 15, 10);
    o.line('v', 0, 3, 7, 8); o.line('v', 14, 3, 7, 8);
    o.hl('v', 0, 14, 12);
    o.rect('O', 6, 7, 3, 3); o.set(8, 9, 'o');
  },
};
function drawItems(P, f) {
  const order = ['coin', 'heart', 'potion', 'key', 'apple', 'mushroom', 'gem', 'letter'];
  P.rect('w', 0, 0, 97, 49);
  for (let x = 0; x <= 96; x += 24) P.vl('v', x, 0, 48);
  for (let y = 0; y <= 48; y += 24) P.hl('v', 0, 96, y);
  order.forEach((name, i) => {
    const gx = (i % 4) * 24, gy = Math.floor(i / 4) * 24;
    P.hl('v', gx + 8, gx + 16, gy + 21);
    const o = new Px(18, 18, 1, 1);
    ICONS[name](o, f);
    o.outline();
    P.blit(o, gx + 4, gy + 3);
  });
}

// ── 진행 과정 썸네일 (24×24) ──────────────────────────────────────────
function drawMugStage(P, f, stage = 4) {
  P.rect('w', 0, 0, P.w, P.h);
  P.blit(mugObj(Math.min(stage, 3)), 5, 10);
  if (stage === 2) [['W', 4], ['O', 8], ['d', 12], ['w', 16]].forEach(([c, x]) => P.rect(c, x, 2, 3, 3));
  if (stage === 4) steam(P, 7, 0, 8, f, 'W');
}

// 작품 정의: minW~maxW 사이에서 화면 폭에 맞춰 장면이 좌우로 늘어납니다.
const ART = {
  hero:  { draw: drawHero,  minW: 160, maxW: 240, h: 90,  frames: 8,  fps: 6, pal: 'KWwyOoSsBRrd' },
  rain:  { draw: drawRain,  minW: 176, maxW: 240, h: 72,  frames: 8,  fps: 8, pal: 'KknBbyOoWGg' },
  cat:   { draw: drawCat,   minW: 96,  maxW: 120, h: 96,  frames: 8,  fps: 5, pal: 'KknBWwvSsRry' },
  tape:  { draw: drawTape,  minW: 112, maxW: 112, h: 112, frames: 8,  fps: 8, pal: 'OoWwvKkyRG' },
  night: { draw: drawNight, minW: 128, maxW: 176, h: 90,  frames: 12, fps: 6, pal: 'KknBWwvGsLOy' },
  plant: { draw: drawPlant, minW: 64,  maxW: 64,  h: 96,  frames: 8,  fps: 6, pal: 'vwWKSsLOobBd' },
  items: { draw: drawItems, minW: 97,  maxW: 97,  h: 49,  frames: 8,  fps: 6, pal: 'KWwvYyOoSsBb' },
  mug:   { draw: (P, f) => drawMugStage(P, f, 4), minW: 24, maxW: 24, h: 24, frames: 8, fps: 6, maxK: 4, pal: 'KWwOodG' },
};
// 01 대표 작업 상세 띠: 프레임 잘라 보기 · 확대 위치 (160×90 기준 좌표)
const HERO_CROPS = { frames: { x: 113, y: 36, w: 20, h: 32 }, loupe: { x: 90, y: 43, w: 16, h: 16 } };

// ════════════════════════════════════════════════════════════════════
// RENDERER
// ════════════════════════════════════════════════════════════════════
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Px 버퍼 → canvas (투명 칸은 투명) */
function paint(canvas, P) {
  if (canvas.width !== P.w) canvas.width = P.w;
  if (canvas.height !== P.h) canvas.height = P.h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(P.w, P.h);
  const a = img.data;
  for (let i = 0; i < P.d.length; i++) {
    const c = P.d[i];
    if (!c) continue;
    const rgb = RGB[c];
    a[i * 4] = rgb[0]; a[i * 4 + 1] = rgb[1]; a[i * 4 + 2] = rgb[2]; a[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** 그림 한 장(코드 또는 이미지)의 프레임을 만들어 주는 소스 */
function makeSource(key) {
  const art = ART[key];
  const src = { ...art, key, img: null };
  src.render = (canvas, W, f) => {
    if (src.img) {
      canvas.width = src.minW; canvas.height = src.h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, src.minW, src.h);
      ctx.drawImage(src.img, (f % src.frames) * src.minW, 0, src.minW, src.h, 0, 0, src.minW, src.h);
      return;
    }
    const P = new Px(W, art.h);
    art.draw(P, f);
    paint(canvas, P);
  };
  src.buffer = (W, f) => { const P = new Px(W, art.h); art.draw(P, f); return P; };
  return src;
}

/** ASSETS 에 파일이 지정되어 있으면 이미지로 교체 */
async function applyAsset(src) {
  const cfg = ASSETS[src.key];
  if (!cfg) return;
  const conf = typeof cfg === 'string' ? { src: cfg } : cfg;
  try {
    const img = new Image();
    img.src = conf.src;
    await img.decode();
    src.img = img;
    src.frames = conf.frames || 1;
    src.fps = conf.fps || src.fps;
    src.minW = src.maxW = Math.floor(img.naturalWidth / src.frames);
    src.h = img.naturalHeight;
  } catch (e) {
    console.warn(`[MONUN] ${conf.src} 를 불러오지 못해 코드 그림을 씁니다.`);
  }
}

const SOURCES = {};
const sourceOf = key => (SOURCES[key] ||= makeSource(key));

/** 판(작품 버튼) 하나 */
class Plate {
  constructor(btn) {
    this.btn = btn;
    this.key = btn.dataset.art;
    this.src = sourceOf(this.key);
    this.canvas = btn.querySelector('canvas');
    this.slot = btn.closest('[data-media]') || btn.parentElement;
    this.state = btn.querySelector('.plate__state');
    this.count = btn.querySelector('.plate__count');
    this.icon = btn.querySelector('.plate__badge use');
    this.baseLabel = (btn.getAttribute('aria-label') || '').replace(/, 루프 재생$/, '');
    this.frame = 0;
    this.W = 0;
    this.playing = false;
    this.visible = true;
  }
  layout() {
    const s = this.src, dpr = window.devicePixelRatio || 1;
    const areaW = this.slot.clientWidth;
    if (!areaW) return;
    const dev = Math.floor(areaW * dpr);
    let k = Math.max(1, Math.floor(dev / s.minW));
    if (s.maxK) k = Math.min(k, Math.round(s.maxK * dpr));
    const maxH = Math.max(s.h * 2, window.innerHeight * 0.82);
    k = Math.max(1, Math.min(k, Math.floor((maxH * dpr) / s.h)));
    const W = Math.min(s.maxW, Math.floor(dev / k));
    this.canvas.style.width = `${(W * k) / dpr}px`;
    this.canvas.style.height = `${(s.h * k) / dpr}px`;
    if (W !== this.W) { this.W = W; this.draw(this.frame); }
  }
  draw(f) { this.frame = f; this.src.render(this.canvas, this.W || this.src.minW, f); this.updateBadge(); }
  updateBadge() {
    const n = this.src.frames, pad = v => String(v).padStart(2, '0');
    if (reduceMotion.matches) {
      if (this.state) this.state.textContent = '다음 장';
      if (this.count) this.count.textContent = `${pad(this.frame + 1)}/${pad(n)}`;
      this.icon?.setAttribute('href', '#i-next');
    } else {
      if (this.state) this.state.textContent = this.playing ? '정지' : '재생';
      if (this.count) this.count.textContent = this.playing ? `${pad(this.frame + 1)}/${pad(n)}` : '';
      this.icon?.setAttribute('href', this.playing ? '#i-stop' : '#i-play');
    }
  }
  syncMode() {
    if (reduceMotion.matches) {
      this.btn.removeAttribute('aria-pressed');
      this.btn.setAttribute('aria-label', `${this.baseLabel}, 다음 프레임 보기`);
    } else {
      this.btn.setAttribute('aria-pressed', String(this.playing));
      this.btn.setAttribute('aria-label', `${this.baseLabel}, 루프 재생`);
    }
    this.updateBadge();
  }
}

const plates = [];
let current = null, raf = 0, t0 = 0;

function play(p) {
  if (reduceMotion.matches) { step(p); return; }
  if (current && current !== p) stop(current);
  current = p;
  p.playing = true;
  p.btn.setAttribute('aria-pressed', 'true');
  t0 = performance.now() - p.frame * (1000 / p.src.fps);
  p.updateBadge();
  if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
}
function stop(p, reset = true) {
  p.playing = false;
  p.btn.setAttribute('aria-pressed', 'false');
  if (current === p) current = null;
  if (reset) p.draw(0); else p.updateBadge();
}
function step(p) { p.draw((p.frame + 1) % p.src.frames); }
function tick(now) {
  raf = 0;
  if (!current || document.hidden) return;
  const p = current;
  const f = Math.floor((now - t0) / (1000 / p.src.fps)) % p.src.frames;
  if (f !== p.frame) p.draw(f);
  raf = requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
  else if (current && !raf) { t0 = performance.now() - current.frame * (1000 / current.src.fps); raf = requestAnimationFrame(tick); }
});

// ════════════════════════════════════════════════════════════════════
// UI
// ════════════════════════════════════════════════════════════════════
const SVGNS = 'http://www.w3.org/2000/svg';
const sq = (x, y, s) => `M${x} ${y}h${s}v${s}h-${s}z`;

/** 격자 워드마크 MONUN + 주황 마침표 */
function buildWordmark() {
  const h1 = document.querySelector('.wordmark');
  if (!h1) return;
  const letters = 'MONUN'.split('');
  const glyphs = letters.map(ch => WORDMARK[ch]);
  const rows = 7;
  let lastCell = 0;
  const render = () => {
    const width = h1.clientWidth;
    const gap = width < 600 ? 1 : 2;
    const cols = glyphs.reduce((s, g) => s + g[0].length, 0) + gap * letters.length + 2;
    const cell = Math.max(3, Math.floor(width / cols));
    if (cell === lastCell) return;
    lastCell = cell;
    const tile = cell >= 10 ? cell - 2 : cell - 1;
    const dot = Math.max(2, Math.round(cell * 0.14));
    let on = '', off = '', acc = '', cx = 0;
    const lit = new Set();
    glyphs.forEach(g => {
      g.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') lit.add(`${cx + x},${y}`); });
      cx += g[0].length + gap;
    });
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = x * cell, py = y * cell;
      if (x >= cols - 2 && y >= rows - 2) acc += sq(px, py, tile);
      else if (lit.has(`${x},${y}`)) on += sq(px, py, tile);
      else off += sq(px + Math.floor((cell - dot) / 2), py + Math.floor((cell - dot) / 2), dot);
    }
    const W = cols * cell, H = rows * cell;
    h1.querySelector('svg')?.remove();
    h1.querySelector('.wordmark__fallback')?.remove();
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path class="off" d="${off}"/><path class="on" d="${on}"/><path class="acc" d="${acc}"/>`;
    h1.appendChild(svg);
  };
  render();
  new ResizeObserver(render).observe(h1);
}

/** 도트 숫자: data-dotnum="01" → 5×7 도트 매트릭스 */
function buildDotNums() {
  document.querySelectorAll('[data-dotnum]').forEach(el => {
    const str = el.dataset.dotnum, cell = Number(el.dataset.cell || 4);
    const cols = str.length * 6 - 1, tile = cell - 1;
    let on = '', off = '';
    [...str].forEach((ch, n) => {
      const g = DIGITS57[ch];
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) {
        const d = sq((n * 6 + x) * cell, y * cell, tile);
        if (g[y][x] === '#') on += d; else off += d;
      }
      if (n < str.length - 1) for (let y = 0; y < 7; y++) off += sq((n * 6 + 5) * cell, y * cell, tile);
    });
    const W = cols * cell - 1, H = 7 * cell - 1;
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="off" d="${off}"/><path class="on" d="${on}"/></svg>`;
  });
}

/** 01 상세 띠: 프레임 필름, 8배 확대, 팔레트 */
function buildHeroDetail() {
  const src = sourceOf('hero');
  const film = document.querySelector('[data-filmstrip="hero"]');
  const { frames: fc, loupe: lc } = HERO_CROPS;
  if (film && !src.img) {
    film.innerHTML = '';
    for (let f = 0; f < src.frames; f++) {
      const P = src.buffer(160, f);
      const C = new Px(fc.w, fc.h);
      for (let y = 0; y < fc.h; y++) for (let x = 0; x < fc.w; x++) C.set(x, y, P.get(fc.x + x, fc.y + y));
      const li = document.createElement('li');
      const cv = document.createElement('canvas');
      cv.style.width = `${fc.w * 2}px`; cv.style.height = `${fc.h * 2}px`;
      paint(cv, C);
      const label = document.createElement('span');
      label.textContent = String(f + 1).padStart(2, '0');
      li.append(cv, label);
      film.appendChild(li);
    }
  }
  const loupe = document.querySelector('[data-loupe="hero"]');
  if (loupe && !src.img) {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const z = 8, size = lc.w * z;
    loupe.width = size * dpr; loupe.height = size * dpr;
    const ctx = loupe.getContext('2d');
    ctx.scale(dpr, dpr);
    const P = src.buffer(160, 0);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < lc.h; y++) for (let x = 0; x < lc.w; x++) {
      const c = P.get(lc.x + x, lc.y + y);
      if (!c) continue;
      ctx.fillStyle = PAL[c];
      ctx.fillRect(x * z, y * z, z - 1, z - 1);
    }
  }
  const keys = [...ART.hero.pal];
  const pal = document.querySelector('[data-palette="hero"]');
  if (pal) {
    pal.innerHTML = '';
    keys.forEach(k => {
      const li = document.createElement('li');
      const sw = document.createElement('i');
      sw.style.background = PAL[k];
      li.append(sw, document.createTextNode(PAL[k]));
      li.title = PAL_NAMES[k];
      pal.appendChild(li);
    });
  }
  document.querySelectorAll('[data-swatches]').forEach(el => {
    el.innerHTML = '';
    [...ART[el.dataset.swatches].pal].forEach(k => { const i = document.createElement('i'); i.style.background = PAL[k]; el.appendChild(i); });
  });
}

/** 04 진행 과정 정지 썸네일 */
function buildThumbs() {
  document.querySelectorAll('canvas[data-thumb]').forEach(cv => {
    const P = new Px(24, 24);
    drawMugStage(P, 0, Number(cv.dataset.thumb));
    paint(cv, P);
  });
}

function initPlates() {
  document.querySelectorAll('.plate[data-art]').forEach(btn => plates.push(new Plate(btn)));
  plates.forEach(p => {
    p.syncMode();
    p.layout();
    p.btn.addEventListener('click', () => {
      if (reduceMotion.matches) step(p);
      else if (p.playing) stop(p);
      else play(p);
    });
  });
  const ro = new ResizeObserver(entries => entries.forEach(e => plates.filter(p => p.slot === e.target).forEach(p => p.layout())));
  plates.forEach(p => ro.observe(p.slot));
  window.addEventListener('resize', () => plates.forEach(p => p.layout()));

  // 화면 밖으로 나가면 멈춤
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    const p = plates.find(pl => pl.btn === e.target);
    if (!p) return;
    p.visible = e.isIntersecting;
    if (!e.isIntersecting && p.playing) stop(p, false);
  }), { threshold: 0.15 });
  plates.forEach(p => io.observe(p.btn));

  reduceMotion.addEventListener('change', () => {
    if (current) stop(current);
    plates.forEach(p => p.syncMode());
  });

  // 작업 색인 → 해당 작업으로 이동 후 재생
  document.querySelectorAll('[data-select]').forEach(a => a.addEventListener('click', () => {
    const p = plates.find(pl => pl.key === a.dataset.select);
    if (!p) return;
    if (reduceMotion.matches) return;
    if (current && current !== p) stop(current);
    setTimeout(() => { if (!p.playing) play(p); }, 450);
  }));

  // ASSETS 에 지정된 파일이 있으면 불러와 다시 그림
  Promise.all(Object.keys(ART).map(k => applyAsset(sourceOf(k)))).then(() => {
    plates.forEach(p => { p.W = 0; p.layout(); });
  });
}

function initNav() {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  const label = btn.querySelector('.nav-toggle__label');
  const icon = btn.querySelector('use');
  const set = open => {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    label.textContent = open ? '닫기' : '메뉴';
    icon.setAttribute('href', open ? '#i-close' : '#i-menu');
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) set(false); });
}

function initForm() {
  const form = document.querySelector('.form');
  if (!form) return;
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const required = [...form.querySelectorAll('[required]')];
    let firstBad = null;
    required.forEach(el => {
      const ok = el.value.trim() !== '' && el.checkValidity();
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) {
      status.textContent = '이름, 올바른 이메일, 내용을 확인해 주세요.';
      firstBad.focus();
      return;
    }
    // 실제 사이트에서는 여기에서 메일 서비스나 폼 서비스로 전송하세요.
    status.textContent = '문의를 받았습니다. 영업일 2일 안에 hello@monun.studio 에서 답장드릴게요.';
    form.reset();
    required.forEach(el => el.removeAttribute('aria-invalid'));
  });
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });
}

buildWordmark();
buildDotNums();
buildHeroDetail();
buildThumbs();
initPlates();
initNav();
initForm();
