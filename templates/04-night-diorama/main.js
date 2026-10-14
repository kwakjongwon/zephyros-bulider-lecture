/* ─────────────────────────────────────────────────────────────
   밤항구 NIGHT HARBOR — 템플릿 04 · 밤의 디오라마
   모든 도트 그림은 이 파일에서 코드로 그립니다(외부 이미지 0개).
   실제 그림 파일이 준비되면 아래 ASSETS에 경로만 넣으세요. → assets/README.md
   ───────────────────────────────────────────────────────────── */

// ── ASSETS ─────────────────────────────────────────────────────
const ASSETS = {
  // 히어로 레이어 PNG (1px = 1도트, 정수 배율로 확대됨). 아래 정렬·왼쪽 정렬로 그려집니다.
  heroLayers: { sky: null, far: null, village: null, near: null },        // 가로 화면용 (권장 400×180)
  heroLayersMobile: { sky: null, far: null, village: null, near: null },  // 세로 화면용 (권장 160×300)
  heroWindows: null,        // village PNG를 쓸 때 창문 좌표 [[x, y, w, h], ...] (레이어 좌표)
  apprenticeSheet: null,    // 견습생 스프라이트 시트: 11×16 프레임 4개 가로 (대기1·대기2·걷기1·걷기2)
  sprites: {                // [data-sprite] 캔버스를 PNG로 교체 (키 = data-sprite 이름)
    logo: null, iconLetter: null, iconLamp: null, iconTalk: null, faceFisher: null,
    portraitApprentice: null, portraitKeeper: null, portraitCat: null, portraitFisher: null,
  },
  screenshots: [null, null, null], // 실제 게임 스크린샷 (16:9 PNG/WebP) — 넣으면 도트 비네트 대신 표시
  trailerPoster: null,      // 트레일러 썸네일 이미지
  trailer: null,            // mp4 경로 또는 YouTube embed URL (https://www.youtube.com/embed/...)
  wishlistUrl: null,        // 스토어 위시리스트 주소 — 넣으면 '위시리스트에 추가' 버튼이 이 주소로 이동
};

// ── PALETTE (style.css의 :root 토큰을 그대로 읽습니다) ───────────
// 도트 규칙: 외곽선 = k(--bg) 1px · 명암 3단계(그림자 → 기본 → 하이라이트) · 빛은 왼쪽 위(달) · 따뜻한 색(a)은 불빛에만
const P = {};
const TOKENS = { k: '--bg', s: '--surface', h: '--haze', d: '--teal-deep', t: '--teal', a: '--accent', c: '--text' };
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  for (const [ch, name] of Object.entries(TOKENS)) P[ch] = cs.getPropertyValue(name).trim();
}

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = motionQuery.matches;
const FPS = 12; // 픽셀 아트 프레임 속도

// ── PIXEL HELPERS ──────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g, w, h };
}
function px(g, ch, x, y, w = 1, h = 1) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = P[ch];
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
/** 정렬 디더(4×4 Bayer): density 0~1 */
function dither(g, ch, x0, y0, w, h, density) {
  g.fillStyle = P[ch];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const d = typeof density === 'function' ? density(x, y) : density;
    if (d > bayer(x, y)) g.fillRect(x, y, 1, 1);
  }
}
/** 문자열 도트맵 그리기. sub: 색 치환, flip: 좌우 반전 */
function drawMap(g, map, x, y, { flip = false, sub = null } = {}) {
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let i = 0; i < row.length; i++) {
      let ch = row[flip ? row.length - 1 - i : i];
      if (ch === '.' || ch === ' ') continue;
      if (sub && sub[ch]) ch = sub[ch];
      if (ch === '.') continue;
      g.fillStyle = P[ch];
      g.fillRect(x + i, y + r, 1, 1);
    }
  }
}
const spriteCache = new Map();
function spriteCanvas(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (spriteCache.has(key)) return spriteCache.get(key);
  const map = SPRITES[name];
  const L = makeLayer(map[0].length, map.length);
  drawMap(L.g, map, 0, 0, opts);
  spriteCache.set(key, L.c);
  return L.c;
}
/** 좌우 대칭 도트맵: 왼쪽 절반 문자열 → 전체 */
const mirror = (rows) => rows.map((r) => r + [...r].reverse().join(''));
/** 도트맵 일부 덮어쓰기 (공백은 건너뜀) */
function patch(map, edits) {
  const out = map.slice();
  for (const [x, y, str] of edits) {
    const row = [...out[y]];
    [...str].forEach((ch, i) => { if (ch !== ' ') row[x + i] = ch; });
    out[y] = row.join('');
  }
  return out;
}
/** 화면 폭에 맞춰 정수 배율로 캔버스 크기 결정 (가로를 꽉 채우고 넘친 1도트 미만은 잘림) */
function fitCanvas(canvas, cssW, cssH, targetW) {
  const s = Math.max(1, Math.round(cssW / targetW));
  const W = Math.ceil(cssW / s), H = Math.ceil(cssH / s);
  canvas.width = W; canvas.height = H;
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
  return { W, H, s };
}

// ── SPRITES ────────────────────────────────────────────────────
// 문자 = 팔레트: k 외곽선/가장 어두운 남색 · s 보조 면 · h 안개 · d 짙은 청록 · t 청록 · a 불빛 · c 크림 · . 투명
// 실제 PNG로 바꿀 때는 ASSETS.sprites / ASSETS.apprenticeSheet 에 경로를 넣으세요.
const SPRITES = {
  // 견습생 11×16 — 오른쪽을 보고 등불을 든 모습
  apprenticeIdle0: [
    '....kkkk...',
    '...kttttk..',
    '..kttttttk.',
    '..kdddddkkk',
    '..kscccck..',
    '..kscckck..',
    '...kccck...',
    '..kttttk...',
    '.khhhhhhk..',
    '.kshdhhhhk.',
    '.kshhdhhkck',
    '.kshhhdkkak',
    '.kshhhhkacak',
    '..kkkkkkkak',
    '...kk.kk.k.',
    '...kk.kk...',
  ],
  apprenticeIdle1: null, // 아래에서 생성 (등불 깜빡임)
  apprenticeWalk0: null,
  apprenticeWalk1: null,

  // 우체국 고양이 8×7 (왼쪽을 봄)
  cat0: [
    'k.k.....',
    'kkk.....',
    'akak...k',
    'kkkk...k',
    '.kkkkkkk',
    '.kkkkkk.',
    '.k.k.kk.',
  ],
  cat1: null, // 눈 감은 프레임

  // 등대 앞 작은 배 30×13 (뱃머리 왼쪽)
  boat: [
    '......................k...........',
    '.....................kak..........',
    '......................h...........',
    '......................h...kkkkkkk.',
    '......................h...kccccck.',
    '......................h...khhhhhk.',
    '......................h...khaahsk.',
    '......................h...khaahsk.',
    'kk....................h...khhhhsk.',
    'kckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    '.kccccccccccccccccccccccccccccccck',
    '..ktttttttttttttttttttttttttttttk.',
    '...kttttttttttttttttttttttttttdk..',
    '....kddddddddddddddddddddddddddk...',
    '.....kkkkkkkkkkkkkkkkkkkkkkkkkk....',
  ].map((r) => r.slice(0, 34)),

  // 가로등 5×18
  lamp: [
    '.kkk.',
    'kacak',
    'kaaak',
    '.kkk.',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '..k..',
    '.kkk.',
    'kkkkk',
  ],

  // 나무
  treeRound: [
    '..kkk..',
    '.kttdk.',
    'kttdddk',
    'ktdddsk',
    'kddddsk',
    '.kdssk.',
    '..kkk..',
    '...k...',
  ],
  treeCypress: [
    '..k..',
    '.ktk.',
    '.ktk.',
    'ktddk',
    'ktddk',
    'ktdsk',
    'ktdsk',
    'kddsk',
    '.kdk.',
    '..k..',
  ],

  // 상자 7×6, 우편 자루 6×6
  crate: [
    'kkkkkkk',
    'khhhhsk',
    'khkhksk',
    'khhkhsk',
    'kssssk.',
    'kkkkkkk',
  ],
  sack: [
    '..ck..',
    '.kcck.',
    'khhhsk',
    'khhhsk',
    'khhssk',
    '.kkkk.',
  ],

  // 16×16 아이콘
  iconLetter: [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kkcccccccccckk.',
    '.kckcccccccckck.',
    '.kcckcccccckcck.',
    '.kccckcccckccck.',
    '.kcccckaakcccck.',
    '.kcccccaaccccck.',
    '.kcccccccccccck.',
    '.khhhhhhhhhhhhk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  iconLamp: [
    '................',
    '......kkkk......',
    '.....kk..kk.....',
    '.....k....k.....',
    '....kkkkkkkk....',
    '...kssssssssk...',
    '....kkkkkkkk....',
    '....kaacaaak....',
    '....kacccaak....',
    '....kacccaak....',
    '....kaacaaak....',
    '....kaaaaaak....',
    '...kkkkkkkkkk...',
    '...kssssssssk...',
    '....kkkkkkkk....',
    '................',
  ],
  iconTalk: [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kcccccccccccck.',
    '.kcccccccccccck.',
    '.kcccccccccccck.',
    '.kcckkckkckkcck.',
    '.kcckkcaackkcck.',
    '.kcccccccccccck.',
    '.khhhhhhhhhhhhk.',
    '..kkhkkkkkkkkk..',
    '...khk..........',
    '...kk...........',
    '...k............',
    '................',
    '................',
  ],
  play: [
    '................',
    '................',
    '....kk..........',
    '....kk..........',
    '....kkkk........',
    '....kkkk........',
    '....kkkkkk......',
    '....kkkkkkkk....',
    '....kkkkkkkk....',
    '....kkkkkk......',
    '....kkkk........',
    '....kkkk........',
    '....kk..........',
    '....kk..........',
    '................',
    '................',
  ],
  logo: [
    '.....kk.....',
    '....kttk....',
    '...kkkkkk...',
    '...kaccak...',
    '...kaaaak...',
    '..kkkkkkkk..',
    '....kcchk...',
    '....kcchk...',
    '....kttdk...',
    '...kccchhk..',
    '...kccchhk..',
    '...ktttddk..',
    '...kccchhk..',
    '..kcccckhhk.',
    '..kcccckhhk.',
    '.kkkkkkkkkkk',
  ],
  faceFisher: mirror([
    '........',
    '....kkkk',
    '...kaaaa',
    '..kaaaaa',
    '..kadada',
    '..kkkkkk',
    '..kshccc',
    '..kcckcc',
    '..kccccc',
    '..khsccc',
    '...kssss',
    '...kssks',
    '....ksss',
    '..kktttt',
    '.kttdttt',
    '.ktttttt',
  ]),

  // 32×32 초상 — 좌우 대칭 바탕 + 비대칭 덧칠
  portraitApprentice: patch(mirror([
    '................',
    '................',
    '..........kkkkkk',
    '........kkttttt t'.replace(' ', '').slice(0, 16),
    '.......kttcttttt',
    '......kttctttttt',
    '......kttttttttt',
    '.....kdddddddddd',
    '....kkkkkkkkkkkk',
    '.....kssssssssss',
    '.....ksscccccccc',
    '.....kscccccccc c'.replace(' ', '').slice(0, 16),
    '.....kscckkccccc',
    '.....kscckkccccc',
    '.....ksccccccccc',
    '......kcaccccccc',
    '......kccccccccc',
    '.......kccccccck',
    '........kkcccccc',
    '..........kkkkkk',
    '.........ktttttt',
    '.......kktttdttt',
    '.....kkhhktttttt',
    '....khhhhhkttttt',
    '...khhhhhhhkdddd',
    '..khhhhhhhhhkhhh',
    '..khshhhhhhhhkhh',
    '.khsshhhhhhhhhkh',
    '.khsshhhhhhhhhhk',
    '.khsshhhhhhhhhhk',
    '.khsshhhhhhhhhhk',
    '.khsshhhhhhhhhhk',
  ]), [
    [9, 12, 'c'], [21, 12, 'c'],                 // 눈 반짝임
    [22, 25, 'd'], [21, 26, 'd'], [20, 27, 'd'], [19, 28, 'd'], [18, 29, 'd'], [17, 30, 'd'], [16, 31, 'd'], // 가방끈
    [23, 26, 'sss'], [24, 27, 'ss'], [25, 28, 'sss'], [25, 29, 'sss'], [25, 30, 'sss'], [25, 31, 'sss'],     // 오른쪽 그늘
    [26, 26, 'kkkk'], [26, 27, 'kaak'], [26, 28, 'kcak'], [26, 29, 'kaak'], [26, 30, 'kkkk'],                // 등불
  ]),
  portraitKeeper: patch(mirror([
    '................',
    '................',
    '................',
    '.........kkkkkkk',
    '.......kkssssss s'.replace(' ', '').slice(0, 16),
    '......ksshssssss',
    '......kssssssssa',
    '.....kkkkkkkkkkk',
    '....kkkkkkkkkkkk',
    '......kccccccccc',
    '.....kcccccccccc',
    '.....khcckkkkccc',
    '.....khcccccccc c'.replace(' ', '').slice(0, 16),
    '.....khcckkccccc',
    '.....khccccccccc',
    '.....kcccccccchh',
    '.....kccccccccch',
    '.....kccccccccck',
    '.....kcccccccccc',
    '......kccccccccc',
    '......kcccccccch',
    '.......kccccccch',
    '........kccccccc',
    '......kkdkcccccc',
    '....kkdddkkccccc',
    '...kdddddddkkkcc',
    '..kddtdddddddkkk',
    '..kdttddddddddda',
    '.kdttdddddddddkd',
    '.kdttdddddddddda',
    '.kdttdddddddddkd',
    '.kdttddddddddddd',
  ]), [
    [10, 13, 'c'], [20, 13, 'c'],
    [15, 15, 'hh'], [16, 16, 'h'],
  ]),
  portraitCat: patch(mirror([
    '................',
    '................',
    '....kk..........',
    '....khk.........',
    '....khhk........',
    '....khshk.......',
    '....kshsskkkkkkk',
    '....ksssssssssss',
    '...kssssssssssss',
    '...kssssssssssss',
    '...ksskkkkssssss',
    '..kssk.aaakssss s'.replace(' ', '').slice(0, 16),
    '..ksskaakaakssss',
    '..ksskaakaakssss',
    '..ksskaaaaakssss',
    '..kssskaaaksssss',
    '..kssssskkkkssss',
    '..ksssssssssssck',
    '...ksssssssssskk',
    '....ksssssssssss',
    '.....kksssssssss',
    '.......kkkkkkkkk',
    '......kssssssaaa',
    '.....ksssssssaca',
    '....kssssssssaaa',
    '...ksssssssssssa',
    '...ksssssssssssa',
    '..kssssssssssssss',
    '..ksssssssssssss',
    '..ksssssssssssss',
    '..ksssssssssssss',
    '..ksssssssssssss',
  ].map((r) => r.slice(0, 16))), [
    [10, 12, 'c'], [20, 12, 'c'],
  ]),
  portraitFisher: patch(mirror([
    '................',
    '................',
    '..........kkkkkk',
    '........kkaaaaaa',
    '.......kaaaaaaaa',
    '......kaaaaaaaaa',
    '......kaaaaaaaaa',
    '.....kadadadadad',
    '.....kadadadadad',
    '.....kkkkkkkkkkk',
    '.....khcccccccc c'.replace(' ', '').slice(0, 16),
    '.....khccccccccc',
    '.....khckkccccc c'.replace(' ', '').slice(0, 16),
    '.....khccckcccc c'.replace(' ', '').slice(0, 16),
    '.....khccccccccc',
    '.....kccccccccch',
    '.....khcccccccch',
    '.....kshccccccch',
    '......ksshhsssss',
    '......kssssskkkk',
    '.......ksssssss s'.replace(' ', '').slice(0, 16),
    '........kkssssss',
    '......kkkkkkkkkk',
    '....kkttttttttdd',
    '...kttttttttttdc',
    '..ktttttttttttdc',
    '..kttttttttttttd',
    '.kttdtttttttttt t'.replace(' ', '').slice(0, 16),
    '.kttdttttttttttt',
    '.kttdttttttttttt',
    '.kttdttttttttttt',
    '.kttdttttttttttt',
  ]), [
    [9, 12, 'c'], [21, 12, 'c'],
  ]),
};
// 파생 프레임
SPRITES.apprenticeIdle1 = patch(SPRITES.apprenticeIdle0, [[9, 12, 'c'], [8, 13, 'a']]);
SPRITES.apprenticeWalk0 = patch(SPRITES.apprenticeIdle0, [[2, 14, '.kk..kk..'], [2, 15, 'kk....kk.']]);
SPRITES.apprenticeWalk1 = patch(SPRITES.apprenticeIdle0, [[2, 14, '..kkkk...'], [2, 15, '..kk.kk..']]);
SPRITES.cat1 = patch(SPRITES.cat0, [[0, 2, 'kkkk']]);

/** 집 한 채. 창문 좌표는 wins 배열에 기록(불빛은 프레임마다 따로 그림) */
function drawHouse(g, x, base, o, wins) {
  const { w, wallH } = o;
  const top = base - wallH;
  const wall = o.wall, shade = o.wall === 'h' ? 's' : 'k';
  const roof = o.roofCol, roofHi = o.roofCol === 'd' ? 't' : 'h';
  // 벽
  px(g, 'k', x, top, w, wallH);
  px(g, wall, x + 1, top + 1, w - 2, wallH - 1);
  px(g, shade, x + w - 3, top + 1, 2, wallH - 1);
  px(g, shade, x + 1, top + 1, w - 2, 1);
  if (o.roof === 'gable') {
    // 앞면 박공: 삼각 벽 + 1px 지붕 띠 + 외곽선
    for (let r = 1; ; r++) {
      const y = top - r;
      const lx = x - 1 + (r - 1), rx = x + w - (r - 1);
      if (rx < lx) break;
      if (rx - lx <= 1) { px(g, 'k', lx, y, rx - lx + 1, 1); break; }
      px(g, 'k', lx, y); px(g, 'k', rx, y);
      px(g, roofHi, lx + 1, y); px(g, roof, rx - 1, y);
      if (rx - lx >= 4) px(g, wall, lx + 2, y, rx - lx - 3, 1);
    }
    px(g, 'k', x - 1, top, w + 2, 1);
    if (w >= 13) wins.push({ x: x + (w >> 1), y: top - 3, w: 1, h: 2 });
  } else {
    // 옆면 지붕: 사다리꼴
    const rh = o.roofH || 5;
    for (let r = 0; r < rh; r++) {
      const y = top - 1 - r;
      const l = x - 1 + r, rr = x + w - r;
      px(g, 'k', l, y, rr - l + 1, 1);
      if (r < rh - 1) px(g, roof, l + 1, y, rr - l - 1, 1);
      if (r === rh - 2) px(g, roofHi, l + 1, y, rr - l - 2, 1);
      if (r > 0 && r < rh - 1) px(g, roofHi, l + 1, y, 1, 1);
    }
    px(g, 'k', x - 1, top, w + 2, 1);
    if (o.chimney) {
      const cx = x + w - 5;
      px(g, 'k', cx, top - rh - 2, 3, 3); px(g, 's', cx + 1, top - rh - 2, 1, 2);
    }
  }
  // 창문·문
  const wy = top + 3;
  if (o.door !== false) {
    const dx = o.doorX != null ? x + o.doorX : x + 2;
    px(g, 'k', dx, base - 5, 3, 5);
    if (o.porch) wins.push({ x: dx + 3, y: base - 6, w: 1, h: 1, porch: true });
  }
  for (const wx of o.windows) wins.push({ x: x + wx, y: wy, w: 2, h: 3 });
  for (const wd of wins) if (!wd.drawn) { px(g, 'k', wd.x, wd.y, wd.w, wd.h); wd.drawn = true; }
}

/** 등대: 탑(크림/안개 + 청록 띠) · 회랑 · 등불실 · 지붕 */
function drawLighthouse(g, cx, base, h) {
  const top = base - h;
  for (let y = top; y < base; y++) {
    const f = (y - top) / h;
    const half = Math.round(3 + f * 2);
    const band = ((y - top) % 10) >= 6 && (y - top) % 10 <= 8 && y < base - 3;
    for (let x = cx - half; x <= cx + half; x++) {
      let ch;
      if (x === cx - half || x === cx + half) ch = 'k';
      else if (x <= cx) ch = band ? 't' : 'c';
      else if (x >= cx + half - 1) ch = band ? 'k' : 's';
      else ch = band ? 'd' : 'h';
      px(g, ch, x, y);
    }
  }
  // 작은 창
  for (let y = top + 3; y < base - 6; y += 10) px(g, 'k', cx, y, 1, 2);
  // 문
  px(g, 'k', cx - 1, base - 4, 3, 4);
  px(g, 's', cx - 1, base - 4, 1, 1);
  // 회랑
  px(g, 'k', cx - 5, top - 1, 11, 1);
  px(g, 'h', cx - 5, top - 2, 11, 1);
  for (let x = cx - 5; x <= cx + 5; x += 2) px(g, 'k', x, top - 3, 1, 1);
  px(g, 'k', cx - 5, top - 4, 11, 1);
  // 등불실 틀 (불빛은 프레임마다)
  px(g, 'k', cx - 3, top - 9, 7, 5);
  // 지붕
  px(g, 'k', cx - 3, top - 10, 7, 1);
  px(g, 'k', cx - 2, top - 11, 5, 1);
  px(g, 'd', cx - 2, top - 10, 5, 1);
  px(g, 't', cx - 2, top - 10, 2, 1);
  px(g, 'k', cx - 1, top - 12, 3, 1);
  px(g, 'k', cx, top - 13, 1, 1);
  px(g, 'k', cx - 4, top - 10, 1, 1); px(g, 'k', cx + 4, top - 10, 1, 1);
  return { lx: cx, ly: top - 7, top };
}
function drawLampRoom(g, cx, ly, mode) {
  // mode: 0 기본, 1 정면(번쩍)
  const glass = mode === 1 ? 'c' : 'a';
  px(g, glass, cx - 2, ly - 1, 5, 3);
  if (mode !== 1) { px(g, 'c', cx - 1, ly, 1, 1); px(g, 'k', cx, ly - 1, 1, 3); }
}

function drawTree(g, kind, x, base) {
  const m = SPRITES[kind];
  drawMap(g, m, x, base - m.length);
}

// ── HARBOR SCENE (히어로·트레일러·마무리 띠가 같은 엔진을 씁니다) ─────
class HarborScene {
  constructor(W, H, L) {
    this.W = W; this.H = H; this.L = L;
    this.windows = [];
    this.rand = rng(L.seed || 7);
    this.build();
  }
  off(f, pan) { return Math.round(pan * f); }

  build() {
    const { W, H, L } = this;
    const F = L.factors;
    const m = (f) => Math.ceil(L.pan * f) + 2;
    this.layers = {
      sky: makeLayer(W + m(F.sky), H),
      far: makeLayer(W + m(F.far), H),
      village: makeLayer(W + m(F.village), H),
      near: makeLayer(W + m(F.near), H),
      fore: L.fore ? makeLayer(W + m(F.fore), H) : null,
    };
    this.buildSky(this.layers.sky);
    this.buildFar(this.layers.far);
    this.buildVillage(this.layers.village);
    this.buildNear(this.layers.near);
    if (L.fore) this.buildFore(this.layers.fore);
    this.buildWater();
    // 창문 켜지는 순서 (앞줄부터 섞어서)
    const r = rng((L.seed || 7) + 99);
    this.windows.forEach((w) => { w.order = r() + (w.porch ? 0.3 : 0); });
    this.windows.sort((a, b) => a.order - b.order);
    if (L.layerImages) this.applyLayerImages(L.layerImages);
  }

  applyLayerImages(imgs) {
    for (const key of Object.keys(imgs)) {
      const src = imgs[key];
      if (!src) continue;
      const img = new Image();
      img.onload = () => {
        const Ly = this.layers[key];
        Ly.g.clearRect(0, 0, Ly.w, Ly.h);
        Ly.g.drawImage(img, 0, Ly.h - img.height);
        if (key === 'village') {
          this.windows = (ASSETS.heroWindows || []).map(([x, y, w, h], i) => ({ x, y: y + Ly.h - img.height, w, h, order: i }));
        }
        this.onChange && this.onChange();
      };
      img.src = src;
    }
  }

  buildSky(Ly) {
    const { g, w } = Ly;
    const { L } = this;
    const hz = L.horizon;
    // 하늘: 글자 뒤는 단색, 달과 마을 쪽으로 갈수록 수평선의 밝은 띠가 높아짐 (곡선 띠 + 2px 체크 디더)
    const sp0 = L.spanLeft ?? 12, sp1 = L.spanRight ?? 64;
    const gx0 = L.glowX0 ?? 0;
    const spanAt = (x) => lerp(sp0, sp1, Math.exp(-Math.pow((x - L.domeX) / L.domeW, 2)) * smooth(gx0, gx0 + w * 0.1, x));
    this.spanAt = spanAt;
    const BANDS = [[0.28, 'k'], [0.33, 'ks'], [0.56, 's'], [0.61, 'sh'], [2, 'h']];
    for (let x = 0; x < w; x++) {
      const sp = spanAt(x);
      const y0 = Math.max(0, Math.floor(hz - sp));
      px(g, 'k', x, 0, 1, y0);
      for (let y = y0; y < hz; y++) {
        const v = (y - (hz - sp)) / sp;
        let ch = 'k';
        for (const [lim, c] of BANDS) if (v < lim) { ch = c; break; }
        if (ch.length === 2) ch = (x + y) % 2 ? ch[0] : ch[1];
        px(g, ch, x, y);
      }
    }
    // 달 (초승달보다 조금 찬 모양, 번짐 없음)
    if (L.moon) {
      const { x: mx, y: my, r } = L.moon;
      for (let y = my - r; y <= my + r; y++) for (let x = mx - r; x <= mx + r; x++) {
        if (Math.hypot(x - mx, y - my) > r + 0.25) continue;
        if (Math.hypot(x - (mx + r * 0.62), y - (my - r * 0.3)) < r * 0.86) continue;
        px(g, 'c', x, y);
      }
      px(g, 'h', mx - Math.round(r * 0.55), my + Math.round(r * 0.1), 2, 1);
      px(g, 'h', mx - Math.round(r * 0.25), my + Math.round(r * 0.6), 1, 1);
      px(g, 'h', mx - Math.round(r * 0.7), my - Math.round(r * 0.35), 1, 1);
    }
    // 별 (고정 위치, 글자 영역·머리글 영역은 비움)
    const R = rng((L.seed || 7) + 3);
    const stars = [];
    const top = L.starTop ?? 3;
    const bottom = hz - sp1 * 0.62;
    const n = Math.round((w * Math.max(10, bottom - top)) / 230);
    for (let i = 0; i < n * 4 && stars.length < n; i++) {
      const x = Math.floor(R() * w), y = Math.floor(top + R() * (bottom - top));
      if (this.inText(x, y, 3)) continue;
      if (y > hz - spanAt(x) * 0.7) continue;
      if (L.moon && Math.hypot(x - L.moon.x, y - L.moon.y) < L.moon.r + 6) continue;
      if (stars.some((st) => Math.abs(st.x - x) + Math.abs(st.y - y) < 11)) continue;
      stars.push({ x, y, big: R() < 0.16 });
    }
    for (const st of stars) {
      if (st.big) { px(g, 'c', st.x, st.y); px(g, 's', st.x - 1, st.y); px(g, 's', st.x + 1, st.y); px(g, 's', st.x, st.y - 1); px(g, 's', st.x, st.y + 1); }
      else px(g, R() < 0.5 ? 'c' : 'h', st.x, st.y);
    }
    this.twinkles = stars.filter((st) => !st.big).slice(0, 3).map((st, i) => ({ ...st, period: 3.4 + i * 1.3, phase: i * 1.7 }));
  }

  inText(x, y, pad = 0) {
    const t = this.L.textZone;
    if (!t) return false;
    return x >= t.x0 - pad && x <= t.x1 + pad && y >= t.y0 - pad && y <= t.y1 + pad;
  }

  buildFar(Ly) {
    const { g, w } = Ly;
    const { L } = this;
    const hz = L.horizon;
    const R = rng((L.seed || 7) + 11);
    const p1 = R() * 6, p2 = R() * 6, p3 = R() * 6;
    const hs = [];
    for (let x = 0; x < w; x++) {
      const env = L.farEnv ? L.farEnv(x) : 1;
      const v = 0.55 + 0.25 * Math.sin(x * 0.045 + p1) + 0.14 * Math.sin(x * 0.11 + p2) + 0.06 * Math.sin(x * 0.27 + p3);
      hs.push(Math.round(v * L.farHeight * env));
    }
    for (let x = 0; x < w; x++) {
      const top = hz - hs[x];
      if (hs[x] <= 0) continue;
      px(g, 's', x, top, 1, hz - top);
      px(g, 'h', x, top, 1, 1);
    }
    // 먼 섬과 작은 불빛
    if (L.island) {
      const { x: ix, w: iw } = L.island;
      for (let i = 0; i < iw; i++) {
        const f = i / (iw - 1);
        const hh = Math.round(Math.sin(f * Math.PI) * 3 + (f > 0.3 && f < 0.6 ? 1 : 0));
        if (hh > 0) px(g, 's', ix + i, hz - hh, 1, hh);
      }
      px(g, 'a', ix + Math.round(iw * 0.45), hz - 2, 1, 1);
      this.islandLight = { x: ix + Math.round(iw * 0.45) };
    }
  }

  buildVillage(Ly) {
    const { g, w } = Ly;
    const { L } = this;
    const hz = L.horizon;
    const R = this.rand;
    const T = L.terraces;
    // 땅 높이 지도
    const ground = new Array(w).fill(hz);
    const setG = (x, y) => { if (x >= 0 && x < w) ground[x] = Math.min(ground[x], y); };
    T.forEach((t, i) => {
      for (let x = t.x0; x <= t.x1; x++) setG(x, t.y);
      // 계단 (왼쪽 끝 → 아래 단)
      const below = i === 0 ? hz : T[i - 1].y;
      const steps = below - t.y;
      for (let k = 1; k <= steps; k++) setG(t.x0 - k, t.y + k);
    });
    // 언덕 → 절벽
    if (L.cliffX != null) {
      const top3 = T[T.length - 1];
      const hx0 = top3.x0 + 8;
      for (let x = hx0; x < L.cliffX; x++) {
        const y = Math.round(lerp(top3.y, L.cliffTop, smooth(hx0, L.cliffX, x)));
        setG(x, y);
      }
      for (let x = L.cliffX; x < w; x++) setG(x, L.cliffTop + (x > L.cliffX + L.cliffW ? Math.round((x - L.cliffX - L.cliffW) * 0.6) : 0));
    }
    for (let x = 0; x < w; x++) if (ground[x] < hz) px(g, 'k', x, ground[x], 1, hz - ground[x]);
    // 풀 가장자리
    for (let x = 0; x < w; x++) {
      if (ground[x] >= hz) continue;
      px(g, 'd', x, ground[x], 1, 1);
      if (x > 0 && ground[x] < ground[x - 1]) px(g, 't', x, ground[x], 1, 1);
    }
    // 계단 하이라이트
    T.forEach((t, i) => {
      const below = i === 0 ? hz : T[i - 1].y;
      for (let k = 1; k < below - t.y; k++) if (k % 2 === 0) px(g, 'h', t.x0 - k, t.y + k, 2, 1);
    });
    // 절벽 바위 결
    if (L.cliffX != null) {
      for (let i = 0; i < Math.round((w - L.cliffX) / 3); i++) {
        const rx = Math.round(L.cliffX - 2 + R() * (w - L.cliffX));
        const ry = Math.round(L.cliffTop + 4 + R() * (hz - L.cliffTop - 6));
        if (ry <= ground[clamp(rx, 0, w - 1)] + 2) continue;
        const rw = 4 + Math.floor(R() * 4);
        px(g, 'h', rx + 1, ry, rw - 2, 1);
        px(g, 'h', rx, ry + 1, 1, 1); px(g, 's', rx + 1, ry + 1, rw - 1, 1);
        px(g, 's', rx + 1, ry + 2, rw - 2, 1);
      }
      // 언덕 위 실측백나무
      const top3 = T[T.length - 1];
      for (let x = top3.x1 + 2; x < L.cliffX - 4; x += 7 + Math.floor(R() * 4)) drawTree(g, 'treeCypress', x, ground[x + 2] + 1);
    }
    // 단 벽(돌) — 뒤 단부터
    const wins = this.windows;
    for (let i = T.length - 1; i >= 0; i--) {
      const t = T[i];
      const below = i === 0 ? hz : T[i - 1].y;
      for (let y = t.y + 1; y < below; y++) {
        const row = y - t.y;
        for (let x = t.x0; x <= t.x1; x++) {
          const mortar = row % 3 === 0 || ((x + (Math.floor(row / 3) % 2) * 3) % 6 === 0);
          if (!mortar) px(g, row % 3 === 1 && (x * 7 + row) % 5 === 0 ? 'h' : 's', x, y);
        }
      }
      px(g, 'h', t.x0, t.y, t.x1 - t.x0 + 1, 1);
      // 집 배치
      let x = t.x0 + 2 + (t.offset || 0);
      const plan = t.plan;
      let k = 0;
      while (x < t.x1 - 8) {
        const spec = plan ? plan[k++] : null;
        if (plan && !spec) break;
        const kind = spec ? spec.kind : (R() < 0.18 ? 'tree' : 'house');
        if (kind === 'tree') {
          drawTree(g, R() < 0.5 ? 'treeRound' : 'treeCypress', x, t.y);
          x += 8;
          continue;
        }
        if (kind === 'gap') { x += spec.w; continue; }
        const wHouse = spec?.w ?? [11, 13, 13, 15][Math.floor(R() * 4)];
        if (x + wHouse > t.x1) break;
        const house = {
          w: wHouse,
          wallH: spec?.wallH ?? (8 + Math.floor(R() * 3)),
          roof: spec?.roof ?? (R() < 0.45 ? 'gable' : 'side'),
          wall: spec?.wall ?? (R() < 0.8 ? 'h' : 's'),
          roofCol: spec?.roofCol ?? (R() < 0.6 ? 'd' : 's'),
          chimney: R() < 0.5,
          porch: spec?.porch ?? R() < 0.25,
        };
        if (house.wall === 's' && house.roofCol === 's') house.roofCol = 'd';
        house.windows = wHouse >= 15 ? [6, 10] : wHouse >= 13 ? [6, 9] : [7];
        house.doorX = 2;
        const hw = [];
        drawHouse(g, x, t.y, house, hw);
        hw.forEach((wd) => { wd.terrace = i; wins.push(wd); });
        if (spec?.sign) { // 우체국 간판
          px(g, 'k', x + 3, t.y - house.wallH + 1, 7, 3);
          px(g, 'a', x + 4, t.y - house.wallH + 2, 5, 1);
        }
        x += wHouse + 1 + Math.floor(R() * 2);
      }
    }
    // 등대 + 등대지기 집
    if (L.lighthouse) {
      const { x: lx, h } = L.lighthouse;
      const base = ground[clamp(lx, 0, w - 1)] + 1;
      if (L.lighthouse.cottage !== false) {
        const cw = 11;
        const hw = [];
        drawHouse(g, lx - 9 - cw, base, { w: cw, wallH: 7, roof: 'side', wall: 'h', roofCol: 'd', windows: [6], doorX: 2, roofH: 4 }, hw);
        hw.forEach((wd) => { wd.terrace = 9; wins.push(wd); });
      }
      this.lamp = drawLighthouse(g, lx, base, h);
    }
  }

  buildNear(Ly) {
    const { g, w, h } = Ly;
    const { L } = this;
    const pier = L.pier;
    if (!pier) return;
    const y = pier.y;
    const x0 = pier.x0;
    const qx = L.quay ? L.quay.x0 : Math.min(w, pier.x1 ?? w);
    const wl = y + 7; // 기둥이 물에 닿는 높이
    // 잔교 기둥 + 짧은 물그림자
    for (let x = x0 + 1; x < qx - 2; x += 14) {
      px(g, 'k', x, y + 2, 2, wl - y - 2);
      px(g, 's', x, y + 2, 1, wl - y - 3);
      dither(g, 'k', x, wl, 2, 4, (xx, yy) => 0.75 - (yy - wl) * 0.2);
      px(g, 'h', x - 1, wl, 1, 1); px(g, 'h', x + 2, wl, 1, 1);
    }
    // 잔교 바닥 (윗면 달빛 · 옆면 그림자)
    px(g, 'k', x0 - 1, y - 1, qx - x0 + 1, 4);
    px(g, 'h', x0, y, qx - x0, 1);
    px(g, 's', x0, y + 1, qx - x0, 1);
    for (let x = x0 + 3; x < qx; x += 5) px(g, 's', x, y, 1, 1);
    // 돌 부두 (오른쪽 앞): 물 위로 8도트, 아래는 물그림자
    if (L.quay) {
      const top = y - 1;
      const bot = wl + 1;
      dither(g, 'k', qx, bot, w - qx, 5, (xx, yy) => 0.8 - (yy - bot) * 0.17);
      px(g, 'k', qx, top - 1, w - qx, bot - top + 1);
      px(g, 'h', qx + 1, top, w - qx - 1, 1);
      for (let yy = top + 2; yy < bot; yy++) {
        const row = yy - top - 2, course = Math.floor(row / 3), within = row % 3;
        for (let x = qx + 1; x < w; x++) {
          const joint = (x - qx + (course % 2) * 4) % 8 === 0;
          if (within === 2 || joint) continue;
          px(g, within === 0 && (x - qx + course) % 8 < 5 ? 'h' : 's', x, yy);
        }
      }
      px(g, 'h', qx, top - 1, 1, bot - top + 1);
      // 계류 말뚝
      px(g, 'k', qx + 3, top - 4, 3, 4); px(g, 's', qx + 4, top - 4, 1, 3); px(g, 'k', qx + 2, top - 5, 5, 1);
      for (let x = qx + 2; x < w; x += 7) { px(g, 'h', x, bot, 2, 1); }
    }
    // 가로등 (잔교 끝)
    if (L.lamp) {
      const lxp = L.lamp.x;
      drawMap(g, SPRITES.lamp, lxp - 2, y - 18);
      dither(g, 'a', lxp - 7, y, 15, 1, (xx) => 0.7 - Math.abs(xx - lxp) * 0.1);
      this.lampPos = { x: lxp, y: y - 16 };
    }
    // 상자·우편자루 (부두 위)
    if (L.crates) {
      const cx = L.crates.x;
      drawMap(g, SPRITES.sack, cx, y - 7);
      drawMap(g, SPRITES.crate, cx + 6, y - 7);
      drawMap(g, SPRITES.crate, cx + 13, y - 7);
      this.catPos = { x: cx + 13, y: y - 14 };
    }
  }

  /** 가장 가까운 층: 화면 오른쪽 아래의 굵은 계류 말뚝과 밧줄 */
  buildFore(Ly) {
    const { g, h } = Ly;
    const { L } = this;
    const { xs, top } = L.fore;
    xs.forEach((x, i) => {
      const t0 = top + (i % 2) * 5;
      px(g, 'k', x - 1, t0 - 1, 8, h - t0 + 1);
      px(g, 's', x, t0, 1, h - t0);
      px(g, 'h', x, t0, 6, 1);
      px(g, 's', x + 1, t0 + 1, 4, 1);
      for (let yy = t0 + 5; yy < h; yy += 6) px(g, 'k', x + 2, yy, 3, 1);
      // 쇠고리 밴드
      px(g, 'k', x - 1, t0 + 3, 8, 1); px(g, 'h', x, t0 + 3, 1, 1);
    });
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i] + 6, x1 = xs[i + 1] - 1;
      const y0 = top + (i % 2) * 5 + 4, y1 = top + ((i + 1) % 2) * 5 + 4;
      for (let x = x0; x <= x1; x++) {
        const f = (x - x0) / Math.max(1, x1 - x0);
        const yy = Math.round(lerp(y0, y1, f) + Math.sin(f * Math.PI) * 4);
        px(g, 'k', x, yy, 1, 2);
        if (x % 3 === 0) px(g, 's', x, yy, 1, 1);
      }
    }
  }

  buildWater() {
    const { L, H } = this;
    // 수면 줄무늬 (가로 줄 단위라 시차 이동에도 무늬가 깨지지 않음)
    const hz = L.horizon;
    this.waterRows = [];
    const TH = [0.125, 0.625, 0.375, 0.875];
    for (let y = hz; y < H; y++) {
      const i = y - hz;
      const f = i / Math.max(1, H - hz);
      let ch;
      if (i === 0) ch = 'h';
      else if (i < 4) ch = i % 2 ? 's' : 'h';
      else {
        const v = 1 - clamp((f - 0.12) / 0.62, 0, 1);
        ch = v > TH[i % 4] ? 's' : 'k';
      }
      this.waterRows.push(ch);
    }
    // 잔물결
    const R = rng((L.seed || 7) + 41);
    const n = Math.round((this.W + L.pan) * (H - hz) / 95);
    this.ripples = [];
    for (let i = 0; i < n; i++) {
      const y = hz + 1 + Math.floor(Math.pow(R(), 0.8) * (H - hz - 1));
      const rowCh = this.waterRows[y - hz];
      this.ripples.push({
        x: Math.floor(R() * (this.W + L.pan + 8)), y,
        len: 2 + Math.floor(R() * (y - hz < 12 ? 2 : 4)),
        ph: R() * 6.28, sp: 0.6 + R() * 0.9,
        ch: rowCh === 'k' ? 's' : 'h',
      });
    }
  }

  rowFactor(y) {
    const { L, H } = this;
    const f = (y - L.horizon) / Math.max(1, H - L.horizon);
    return lerp(L.factors.village, L.factors.near * 1.1, f);
  }

  /** 한 장면 그리기. t: 초, p: 스크롤 진행도 0~1 */
  draw(ctx, t, p, opt = {}) {
    const { W, H, L, layers } = this;
    const F = L.factors;
    const pan = reduceMotion ? 0 : p * L.pan;
    const frame = Math.floor(t * FPS);
    const oSky = this.off(F.sky, pan), oFar = this.off(F.far, pan), oVil = this.off(F.village, pan), oNear = this.off(F.near, pan);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers.sky.c, -oSky, 0);
    // 반짝이는 별
    if (!reduceMotion) for (const s of this.twinkles) {
      const v = Math.sin(t * (6.28 / s.period) + s.phase);
      px(ctx, v > 0.55 ? 'c' : v > -0.4 ? 'h' : 's', s.x - oSky, s.y);
    }
    ctx.drawImage(layers.far.c, -oFar, 0);
    // 등대 빛줄기 (빛은 평면 도트 + 디더)
    let lampMode = 0;
    if (this.lamp) {
      const theta = reduceMotion ? -1.1 : t * (Math.PI * 2 / 9) + (L.seed || 0);
      const sx = Math.sin(theta), cz = Math.cos(theta);
      lampMode = cz > 0.93 ? 1 : 0;
      const lx = this.lamp.lx - oVil, ly = this.lamp.ly;
      const len = Math.round(L.beamLen * Math.pow(Math.abs(sx), 0.7));
      const dir = sx < 0 ? -1 : 1;
      if (len > 4) {
        for (let d = 3; d < len; d++) {
          const x = lx + dir * d;
          if (x < 0 || x >= W) continue;
          const half = 0.6 + d * 0.085;
          let dens = 0.62 * Math.pow(1 - d / len, 0.8);
          if (this.inText(x, ly, 6)) dens *= 0.25;
          for (let yy = Math.floor(ly - half); yy <= Math.ceil(ly + half); yy++) {
            const edge = Math.abs(yy - ly) / (half + 0.5);
            const dd = dens * (1 - edge * 0.5) + (yy === ly ? 0.18 : 0);
            if (dd > bayer(x, yy)) px(ctx, d < 9 && yy === ly && (d + frame) % 3 ? 'c' : 'h', x, yy);
          }
        }
      }
    }
    ctx.drawImage(layers.village.c, -oVil, 0);
    if (this.lamp) drawLampRoom(ctx, this.lamp.lx - oVil, this.lamp.ly, lampMode);
    // 창문 불빛
    const N = this.windows.length;
    const lit = opt.litAll || reduceMotion ? N : Math.round(lerp(L.litStart ?? Math.ceil(N * 0.4), N, clamp(p * 1.15, 0, 1)));
    this.litCount = lit;
    for (let i = 0; i < N; i++) {
      const wd = this.windows[i];
      const x = wd.x - oVil;
      if (x < -3 || x > W + 3) continue;
      if (i < lit) {
        px(ctx, 'a', x, wd.y, wd.w, wd.h);
        if (wd.h >= 3) px(ctx, 'c', x, wd.y, 1, 1);
      }
    }
    // 물
    const hz = L.horizon;
    for (let y = hz; y < H; y++) px(ctx, this.waterRows[y - hz], 0, y, W, 1);
    // 잔물결
    for (const r of this.ripples) {
      const o = Math.round(pan * this.rowFactor(r.y));
      const wob = reduceMotion ? 0 : Math.round(Math.sin(t * r.sp + r.ph) * 1.2);
      const vis = reduceMotion || Math.sin(t * r.sp * 0.7 + r.ph * 2) > -0.35;
      if (!vis) continue;
      const x = r.x - o + wob;
      if (x > W || x + r.len < 0) continue;
      px(ctx, r.ch, x, r.y, r.len, 1);
    }
    // 반영: 달
    if (L.moon) {
      const mx = L.moon.x - oSky;
      for (let r = 1; r < Math.min(30, H - hz); r += 2) {
        const wv = Math.max(1, Math.round(L.moon.r * 0.9 * (1 - r / 32)) - ((r + frame) % 3 === 0 ? 1 : 0));
        const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 1.7 + r * 0.8) * 1.4);
        px(ctx, r < 6 ? 'c' : 'h', mx - (wv >> 1) + wob, hz + r, wv, 1);
      }
    }
    // 반영: 앞줄 창문
    for (let i = 0; i < Math.min(lit, N); i++) {
      const wd = this.windows[i];
      const dy = hz - wd.y;
      if (dy > 26 || dy < 0) continue;
      const ry = hz + Math.round(dy * 0.9);
      for (let k = 0; k < 4; k++) {
        const yy = ry + k * 2;
        if (yy >= H) break;
        const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 2.2 + yy * 0.9 + wd.x) * 1);
        if (k === 3 && (frame + wd.x) % 2) continue;
        px(ctx, k < 2 ? 'a' : 'h', wd.x - oVil + wob, yy, Math.max(1, wd.w - (k > 1 ? 1 : 0)), 1);
      }
    }
    if (this.islandLight) {
      const ix = this.islandLight.x - oFar;
      for (let k = 1; k < 6; k += 2) px(ctx, k < 3 ? 'a' : 'h', ix + (reduceMotion ? 0 : Math.round(Math.sin(t * 2 + k))), hz + k, 1, 1);
    }
    ctx.drawImage(layers.near.c, -oNear, 0);
    // 가까운 층
    // 밤배: 스크롤하면 선착장 쪽으로 들어옴, 물결 따라 1px 오르내림
    let boatX = 0, boatY = 0;
    if (L.boat) {
      const bob = reduceMotion ? 0 : (Math.sin(t * 1.6) > 0.2 ? 1 : 0);
      boatX = Math.round(L.boat.x + (reduceMotion ? 0 : p * (L.boat.travel || 0))) - Math.round(pan * (L.boat.f ?? 1));
      boatY = L.boat.water - 12 + bob;
      const wl = L.boat.water;
      for (let k = 0; k < 6; k++) {
        const yy = wl + 1 + k;
        if (yy >= H) break;
        const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 2 + k * 1.3) * 1);
        dither(ctx, k < 2 ? 'd' : 's', boatX + 4 + wob + k, yy, 26 - k * 2, 1, 0.6 - k * 0.08);
      }
      const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 2.4));
      px(ctx, 'a', boatX + 28 + wob, wl + 4, 2, 1);
      px(ctx, 'a', boatX + 22 - wob, wl + 7, 1, 1);
      // 물살 (뒤로 남는 잔물결)
      for (let k = 0; k < 4; k++) if (!reduceMotion && (frame + k) % 4 < 3) px(ctx, 'h', boatX + 34 + k * 4 + ((frame >> 1) % 2), wl + (k % 2), 2, 1);
      const bs = spriteCanvas('boat');
      const vis = wl - boatY + 1;
      ctx.drawImage(bs, 0, 0, bs.width, vis, boatX, boatY, bs.width, vis);
      dither(ctx, 'h', boatX + 3, wl + 1, 28, 1, 0.5);
    }
    // 가로등 반영
    if (this.lampPos) {
      const lx = this.lampPos.x - oNear;
      for (let k = 0; k < 4; k++) {
        const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 2.1 + k) * 1);
        const yy = L.pier.y + 15 + k * 2;
        if (yy < H) px(ctx, k < 2 ? 'a' : 'h', lx - 1 + wob, yy, k < 2 ? 2 : 1, 1);
      }
    }
    // 고양이
    if (this.catPos) {
      const blink = !reduceMotion && (frame % 46) < 2;
      ctx.drawImage(spriteCanvas(blink ? 'cat1' : 'cat0'), this.catPos.x - oNear, this.catPos.y);
    }
    // 견습생
    if (L.char) {
      const walk = reduceMotion ? 0 : Math.round(p * L.char.walk);
      const cx = L.char.x0 + walk - oNear;
      const cy = L.pier.y - 16;
      let name;
      if (this.lastWalk !== undefined && walk !== this.lastWalk) this.walkUntil = t + 0.35;
      this.lastWalk = walk;
      if (!reduceMotion && t < (this.walkUntil || 0)) name = (Math.floor(walk / 3) % 2) ? 'apprenticeWalk0' : 'apprenticeWalk1';
      else name = (!reduceMotion && frame % 8 < 3) ? 'apprenticeIdle1' : 'apprenticeIdle0';
      const sprite = this.sheetFrame(name) || spriteCanvas(name);
      // 등불 빛 웅덩이
      dither(ctx, 'a', cx + 4, L.pier.y, 10, 1, (xx) => 0.6 - Math.abs(xx - (cx + 9)) * 0.12);
      ctx.drawImage(sprite, cx, cy);
      // 등불 반영
      const wob = reduceMotion ? 0 : Math.round(Math.sin(t * 2.3) * 1);
      px(ctx, 'a', cx + 9 + wob, L.pier.y + 16, 1, 1);
      px(ctx, 'h', cx + 9 - wob, L.pier.y + 18, 1, 1);
    }
    if (layers.fore) ctx.drawImage(layers.fore.c, -this.off(F.fore, pan), 0);
  }

  sheetFrame(name) {
    if (!heroSheet) return null;
    const idx = ['apprenticeIdle0', 'apprenticeIdle1', 'apprenticeWalk0', 'apprenticeWalk1'].indexOf(name);
    if (idx < 0) return null;
    const key = 'sheet' + idx;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const L = makeLayer(11, 16);
    L.g.drawImage(heroSheet, idx * 11, 0, 11, 16, 0, 0, 11, 16);
    spriteCache.set(key, L.c);
    return L.c;
  }
}
let heroSheet = null;

/** 가로 화면 구도: 왼쪽 위 하늘에 글, 오른쪽에 마을과 등대, 앞에 잔교와 돌 부두 */
function layoutLandscape(W, H, text) {
  const textBottom = text ? text.bottom : Math.round(H * 0.5);
  const horizon = clamp(Math.max(Math.round(H * 0.62), textBottom + 12), Math.round(H * 0.55), H - 52);
  const shoreX = Math.round(W * 0.5);
  const cliffX = Math.round(W * 0.80);
  const cliffTop = horizon - 44;
  const pierY = horizon + 19;
  const pierX0 = Math.round(W * 0.26);
  const quayX0 = Math.round(W * 0.70);
  const moon = { x: Math.round(W * 0.57), y: Math.round(H * 0.17), r: 8 };
  const textRight = text ? text.right : Math.round(W * 0.45);
  return {
    seed: 7,
    horizon,
    textZone: text ? { x0: 0, y0: 0, x1: text.right + 2, y1: text.bottom + 2 } : null,
    starTop: text ? text.header + 2 : 3,
    spanLeft: 12, spanRight: 96, glowX0: textRight + 2, domeX: Math.round(W * 0.74), domeW: Math.round(W * 0.27),
    moon,
    farHeight: 24,
    farEnv: (x) => 0.2 + 0.8 * smooth(W * 0.3, W * 0.66, x),
    island: { x: Math.round(W * 0.07), w: 24 },
    terraces: [
      { y: horizon - 3, x0: shoreX, x1: cliffX - 3 },
      { y: horizon - 17, x0: shoreX + 12, x1: cliffX + 1, offset: 5 },
      { y: horizon - 31, x0: shoreX + 26, x1: cliffX - 6, offset: 2 },
    ],
    cliffX, cliffTop, cliffW: Math.round(W * 0.16),
    lighthouse: { x: cliffX + 24, h: 34 },
    beamLen: Math.round(W * 0.42),
    pier: { x0: pierX0, y: pierY },
    quay: { x0: quayX0 },
    lamp: { x: pierX0 + 3 },
    crates: { x: quayX0 + 10 },
    boat: { x: Math.round(W * 0.03), water: pierY + 28, travel: 26, f: 1.2 },
    char: { x0: pierX0 + 14, walk: 30 },
    fore: { xs: [Math.round(W * 0.88), Math.round(W * 0.97), Math.round(W * 1.06)], top: pierY + 16 },
    pan: 36,
    factors: { sky: 0.04, far: 0.12, village: 0.42, near: 1, fore: 1.35 },
  };
}
/** 세로 화면 구도: 위쪽 하늘에 글, 아래에 마을·등대·잔교를 다시 배치 */
function layoutPortrait(W, H, text) {
  const textBottom = text ? text.bottom : Math.round(H * 0.45);
  const horizon = clamp(textBottom + 70, Math.round(H * 0.6), H - 60);
  const cliffX = Math.round(W * 0.70);
  const cliffTop = horizon - 36;
  const pierY = horizon + 17;
  const pierX0 = Math.round(W * 0.2);
  const quayX0 = Math.round(W * 0.72);
  return {
    seed: 12,
    horizon,
    textZone: text ? { x0: 0, y0: 0, x1: W, y1: text.bottom + 1 } : null,
    starTop: text ? text.header + 2 : 3,
    spanLeft: 12, spanRight: 72, glowX0: 0, domeX: Math.round(W * 0.66), domeW: Math.round(W * 0.42),
    moon: text?.moon || { x: Math.round(W * 0.8), y: Math.round(H * 0.15), r: 6 },
    farHeight: 18,
    farEnv: (x) => 0.3 + 0.7 * smooth(0, W * 0.6, x),
    island: { x: 2, w: 14 },
    terraces: [
      { y: horizon - 3, x0: Math.round(W * 0.16), x1: cliffX - 3 },
      { y: horizon - 16, x0: Math.round(W * 0.16) + 10, x1: cliffX + 1, offset: 4 },
      { y: horizon - 29, x0: Math.round(W * 0.16) + 22, x1: cliffX - 2, offset: 1 },
    ],
    cliffX, cliffTop, cliffW: Math.round(W * 0.3),
    lighthouse: { x: cliffX + 20, h: 24, cottage: false },
    beamLen: Math.round(W * 0.55),
    pier: { x0: pierX0, y: pierY },
    quay: { x0: quayX0 },
    lamp: { x: pierX0 + 3 },
    crates: { x: quayX0 + 5 },
    boat: { x: 2, water: pierY + 30, travel: 12, f: 1.2 },
    char: { x0: pierX0 + 8, walk: 14 },
    fore: { xs: [Math.round(W * 0.9), Math.round(W * 1.02)], top: pierY + 22 },
    pan: 14,
    factors: { sky: 0.04, far: 0.12, village: 0.42, near: 1, fore: 1.35 },
  };
}

// ── HERO ───────────────────────────────────────────────────────
function initHero() {
  const hero = document.querySelector('[data-hero]');
  const stage = document.querySelector('[data-hero-stage]');
  const canvas = document.querySelector('[data-hero-canvas]');
  if (!hero || !stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  const textEl = document.querySelector('[data-hero-text]');
  const titleEl = document.querySelector('#hero-title');
  const hudTime = document.querySelector('[data-hud-time]');
  const hudCount = document.querySelector('[data-hud-count]');
  const hudBar = document.querySelector('[data-hud-bar]');
  const hudHint = document.querySelector('[data-hud-hint]');

  let scene = null, s = 1, progress = 0, visible = true, raf = 0, last = 0, dirty = true, key = '';

  function build(force = false) {
    if (force) key = '';
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const portrait = vw / vh < 0.9;
    s = portrait ? Math.max(2, Math.round(vw / 130)) : Math.max(2, Math.round(vh / 180));
    const W = Math.ceil(vw / s), H = Math.ceil(vh / s);
    const k = `${W}x${H}x${s}`;
    if (k === key && scene) return;
    key = k;
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
    const hr = hero.getBoundingClientRect();
    let text = null;
    if (textEl) {
      const r = textEl.getBoundingClientRect();
      text = { right: Math.ceil((r.right - hr.left) / s), bottom: Math.ceil((r.bottom - hr.top) / s), header: Math.ceil(64 / s) };
      if (portrait && titleEl) {
        const tr = titleEl.getBoundingClientRect();
        const my = Math.round(((tr.top + tr.bottom) / 2 - hr.top) / s);
        text.moon = { x: W - 20, y: my, r: 6 };
      }
    }
    const L = portrait ? layoutPortrait(W, H, text) : layoutLandscape(W, H, text);
    const imgs = portrait ? ASSETS.heroLayersMobile : ASSETS.heroLayers;
    if (imgs && Object.values(imgs).some(Boolean)) L.layerImages = imgs;
    scene = new HarborScene(W, H, L);
    scene.onChange = () => { dirty = true; kick(); };
    dirty = true;
  }

  function readProgress() {
    const r = hero.getBoundingClientRect();
    const range = hero.offsetHeight - stage.clientHeight;
    progress = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  let hudState = '';
  function updateHud() {
    if (!scene) return;
    const mins = Math.round(lerp(21 * 60, 22 * 60 + 30, reduceMotion ? 1 : progress));
    const hh = Math.floor(mins / 60) - 12, mm = mins % 60;
    const time = `PM ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const count = `${String(scene.litCount).padStart(2, '0')}/${String(scene.windows.length).padStart(2, '0')}`;
    const st = time + count;
    if (st === hudState) return;
    hudState = st;
    hudTime.textContent = time;
    hudCount.textContent = count;
    hudBar.style.width = (scene.litCount / Math.max(1, scene.windows.length)) * 100 + '%';
    hudHint.classList.toggle('is-hidden', progress > 0.04 || reduceMotion);
  }

  function render(now) {
    scene.draw(ctx, now / 1000, progress);
    updateHud();
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (dirty || now - last >= 1000 / FPS) {
      last = now; dirty = false;
      render(now);
    }
    if (!reduceMotion) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  build();
  readProgress();
  render(performance.now());

  addEventListener('scroll', () => {
    if (reduceMotion) return;
    readProgress();
    dirty = true; kick();
  }, { passive: true });
  new ResizeObserver(() => { build(); readProgress(); dirty = true; kick(); }).observe(stage);
  let rz = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { build(true); readProgress(); render(performance.now()); });
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { dirty = true; kick(); } }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { dirty = true; kick(); } });
  motionQuery.addEventListener('change', () => { reduceMotion = motionQuery.matches; dirty = true; kick(); render(performance.now()); });
  kick();
}

// ── VIGNETTES (섹션 안 작은 장면들) ─────────────────────────────
const vignettes = [];
/** 보일 때만 12fps로 다시 그리는 작은 캔버스 */
function registerVignette(canvas, targetW, setup) {
  const box = canvas.parentElement;
  const v = { canvas, ctx: canvas.getContext('2d'), visible: false, state: null, key: '' };
  const size = () => {
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    const fit = fitCanvas(canvas, r.width, r.height || r.width * 9 / 16, targetW);
    const k = `${fit.W}x${fit.H}`;
    if (k === v.key) return;
    v.key = k;
    v.state = setup(fit.W, fit.H);
    v.state.draw(v.ctx, performance.now() / 1000, true);
  };
  v.size = size;
  size();
  new ResizeObserver(size).observe(box);
  new IntersectionObserver(([e]) => {
    v.visible = e.isIntersecting;
    if (v.visible && v.state?.onEnter) v.state.onEnter();
    if (v.visible) kickVignettes();
  }, { threshold: 0.15 }).observe(canvas);
  vignettes.push(v);
  return v;
}
let vRaf = 0, vLast = 0;
function vLoop(now) {
  vRaf = 0;
  if (reduceMotion || document.hidden) return;
  const active = vignettes.filter((v) => v.visible && v.state?.animated);
  if (!active.length) return;
  if (now - vLast >= 1000 / FPS) {
    vLast = now;
    for (const v of active) v.state.draw(v.ctx, now / 1000, false);
  }
  vRaf = requestAnimationFrame(vLoop);
}
function kickVignettes() { if (!vRaf) vRaf = requestAnimationFrame(vLoop); }

/** 바람곶 지도 (위에서 내려다본 모습) */
function mapVignette(W, H) {
  const Ly = makeLayer(W, H);
  const g = Ly.g;
  // 바다
  px(g, 's', 0, 0, W, H);
  for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 9) if (bayer(x, y) < 0.5) px(g, 'h', x, y, 2, 1);
  // 섬 모양 (오른쪽 위로 뻗은 곶)
  const land = (x, y) => {
    const nx = x / W, ny = y / H;
    const body = Math.hypot((nx - 0.55) * 1.15, (ny - 0.48) * 1.5) < 0.42;
    const cape = Math.hypot((nx - 0.83) * 1.8, (ny - 0.2) * 1.6) < 0.17;
    const bay = Math.hypot((nx - 0.22) * 1.4, (ny - 0.86) * 1.4) < 0.2;
    return (body || cape) && !bay;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!land(x, y)) continue;
    const edge = !land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1);
    const shore = !land(x, y + 2) || !land(x - 2, y);
    px(g, edge ? 'k' : shore ? 'd' : 't', x, y);
    if (!edge && !shore && bayer(x, y) < 0.18) px(g, 'd', x, y);
  }
  // 바닷가 거품
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (land(x, y)) continue;
    if ((land(x + 1, y) || land(x, y - 1)) && bayer(x, y) < 0.5) px(g, 'h', x, y);
  }
  // 길 (배달 경로) — 선착장 → 우체국 → 언덕길 → 등대
  const pts = [[0.18, 0.80], [0.30, 0.66], [0.37, 0.52], [0.49, 0.44], [0.60, 0.34], [0.72, 0.26], [0.83, 0.18]];
  const P2 = pts.map(([x, y]) => [Math.round(x * W), Math.round(y * H)]);
  let dashI = 0;
  for (let i = 0; i < P2.length - 1; i++) {
    const [x0, y0] = P2[i], [x1, y1] = P2[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k < n; k++) {
      const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n));
      if ((dashI++ % 4) < 2) px(g, 'a', x, y, 1, 1);
      else px(g, 'k', x, y, 1, 1);
    }
  }
  // 집 (지붕 2×2)
  const R = rng(5);
  for (let i = 0; i < 46; i++) {
    const x = Math.round(W * (0.3 + R() * 0.45)), y = Math.round(H * (0.28 + R() * 0.38));
    if (!land(x - 2, y) || !land(x + 4, y + 3)) continue;
    if (P2.some(([px2, py2]) => Math.abs(px2 - x) < 4 && Math.abs(py2 - y) < 4)) continue;
    px(g, 'k', x - 1, y - 1, 5, 4);
    px(g, R() < 0.6 ? 'h' : 's', x, y, 3, 2);
    if (R() < 0.6) px(g, 'a', x + 1, y + 1, 1, 1);
  }
  // 선착장
  const [qx, qy] = P2[0];
  px(g, 'k', qx - 10, qy - 1, 12, 4); px(g, 'h', qx - 9, qy, 10, 2);
  px(g, 'k', qx - 14, qy + 4, 6, 3); px(g, 't', qx - 13, qy + 5, 4, 1);
  // 등대
  const [lx, ly] = P2[P2.length - 1];
  px(g, 'k', lx - 2, ly - 2, 5, 5); px(g, 'c', lx - 1, ly - 1, 3, 3); px(g, 'a', lx, ly, 1, 1);
  // 나침반
  const cx = W - 12, cy = H - 12;
  px(g, 'h', cx, cy - 6, 1, 13); px(g, 'h', cx - 6, cy, 13, 1); px(g, 'c', cx, cy - 6, 1, 3); px(g, 'k', cx - 1, cy - 1, 3, 3); px(g, 'c', cx, cy, 1, 1);
  return { draw(ctx) { ctx.drawImage(Ly.c, 0, 0); } };
}

/** 섹션 사이 지붕선: 보이는 동안 창문이 하나씩 켜짐 */
function rooflineVignette(W, H) {
  const Ly = makeLayer(W, H);
  const g = Ly.g;
  const R = rng(31);
  const wins = [];
  let x = -4;
  while (x < W) {
    const w = 9 + Math.floor(R() * 4) * 2;
    const wallH = Math.round(H * 0.38 + R() * H * 0.22);
    const base = H;
    const top = base - wallH;
    if (R() < 0.12) { // 나무
      const m = SPRITES.treeRound;
      drawMap(g, m, x, base - m.length - Math.floor(wallH * 0.3), { sub: { t: 's', d: 's', k: 's' } });
      px(g, 's', x + 2, base - Math.floor(wallH * 0.3) - 1, 3, Math.floor(wallH * 0.3) + 1);
      x += 8; continue;
    }
    px(g, 's', x, top, w, wallH);
    const gable = R() < 0.5;
    const rh = gable ? (w + 1) >> 1 : 3;
    for (let r = 0; r < rh; r++) px(g, 's', x - 1 + r, top - 1 - r, w + 2 - r * 2, 1);
    if (!gable && R() < 0.6) px(g, 's', x + w - 4, top - rh - 2, 2, 3);
    const cols = w >= 13 ? [3, w - 5] : [Math.floor(w / 2) - 1];
    for (const cx of cols) {
      const wy = top + 2;
      px(g, 'k', x + cx, wy, 2, 3);
      wins.push({ x: x + cx, y: wy, order: R() });
      if (wallH > 11) { px(g, 'k', x + cx, wy + 5, 2, 3); wins.push({ x: x + cx, y: wy + 5, order: R() }); }
    }
    x += w + 1 + Math.floor(R() * 3);
  }
  wins.sort((a, b) => a.order - b.order);
  let start = null;
  const state = {
    animated: true,
    onEnter() { if (start === null) start = performance.now() / 1000; },
    draw(ctx, t) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(Ly.c, 0, 0);
      const n = reduceMotion ? wins.length : start === null ? 0 : Math.min(wins.length, Math.floor((t - start) * 7));
      for (let i = 0; i < n; i++) { px(ctx, 'a', wins[i].x, wins[i].y, 2, 3); px(ctx, 'c', wins[i].x, wins[i].y, 1, 1); }
      if (n >= wins.length) state.animated = false;
    },
  };
  return state;
}

/** 트레일러 썸네일: 등대를 가운데 둔 다른 각도의 항구 */
function trailerVignette(W, H) {
  const horizon = Math.round(H * 0.64);
  const cliffX = Math.round(W * 0.56);
  const L = {
    seed: 21, horizon, skyStart: Math.round(H * 0.34),
    textZone: null,
    moon: { x: Math.round(W * 0.2), y: Math.round(H * 0.2), r: 9 },
    cloud: { x: Math.round(W * 0.05), y: Math.round(H * 0.32), w: Math.round(W * 0.35) },
    farHeight: 22, farEnv: (x) => 0.4 + 0.6 * Math.sin((x / W) * Math.PI),
    island: { x: Math.round(W * 0.85), w: 20 },
    terraces: [
      { y: horizon - 3, x0: Math.round(W * 0.18), x1: cliffX - 3 },
      { y: horizon - 17, x0: Math.round(W * 0.18) + 12, x1: cliffX + 1, offset: 3 },
      { y: horizon - 31, x0: Math.round(W * 0.18) + 26, x1: cliffX - 6, offset: 1 },
    ],
    cliffX, cliffTop: horizon - 46, cliffW: Math.round(W * 0.12),
    lighthouse: { x: cliffX + 22, h: 32 },
    beamLen: Math.round(W * 0.38),
    pier: { x0: Math.round(W * 0.06), x1: Math.round(W * 0.5), y: horizon + 16 },
    lamp: { x: Math.round(W * 0.14) },
    crates: { x: Math.round(W * 0.4) },
    boat: { x: Math.round(W * 0.55), water: horizon + 30 },
    char: { x0: Math.round(W * 0.24), walk: 0 },
    rocks: null,
    pan: 0, factors: { sky: 0, far: 0, village: 0, near: 0 },
  };
  const scene = new HarborScene(W, H, L);
  return { animated: true, draw(ctx, t) { scene.draw(ctx, t, 1, { litAll: true }); } };
}

/** 마무리 띠: 모든 창에 불이 켜진 바람곶 */
function finaleVignette(W, H) {
  const horizon = Math.round(H * 0.72);
  const cliffX = Math.round(W * 0.78);
  const L = {
    seed: 33, horizon, skyStart: 2,
    textZone: null, moon: null, cloud: null,
    farHeight: 14, farEnv: (x) => 0.3 + 0.7 * smooth(0, W * 0.5, x),
    island: { x: Math.round(W * 0.06), w: 20 },
    terraces: [
      { y: horizon - 3, x0: Math.round(W * 0.3), x1: cliffX - 3 },
      { y: horizon - 17, x0: Math.round(W * 0.3) + 12, x1: cliffX + 1, offset: 3 },
      { y: horizon - 31, x0: Math.round(W * 0.3) + 26, x1: cliffX - 6, offset: 1 },
    ],
    cliffX, cliffTop: horizon - 44, cliffW: Math.round(W * 0.2),
    lighthouse: { x: cliffX + 22, h: 28 },
    beamLen: Math.round(W * 0.35),
    pier: null, boat: null, char: null, rocks: null,
    pan: 0, factors: { sky: 0, far: 0, village: 0, near: 0 },
  };
  const scene = new HarborScene(W, H, L);
  return { animated: true, draw(ctx, t) { scene.draw(ctx, t, 1, { litAll: true }); } };
}

/** 스크린샷 1 — 우체국 안 */
function postofficeVignette(W, H) {
  const Ly = makeLayer(W, H);
  const g = Ly.g;
  const floorY = Math.round(H * 0.74);
  // 벽 · 징두리
  px(g, 's', 0, 0, W, floorY);
  for (let x = 0; x < W; x += 8) px(g, 'k', x, 0, 1, floorY - 18);
  px(g, 'd', 0, floorY - 18, W, 18);
  px(g, 't', 0, floorY - 18, W, 1);
  for (let x = 3; x < W; x += 6) px(g, 'k', x, floorY - 16, 1, 15);
  // 바닥
  px(g, 'k', 0, floorY, W, H - floorY);
  for (let y = floorY + 2; y < H; y += 3) px(g, 's', 0, y, W, 1);
  for (let y = floorY + 2, i = 0; y < H; y += 3, i++) for (let x = (i % 2) * 7; x < W; x += 14) px(g, 'k', x, y, 1, 1);
  // 창문 (밤바다)
  const wx = Math.round(W * 0.08), wy = Math.round(H * 0.14), ww = Math.round(W * 0.24), wh = Math.round(H * 0.32);
  px(g, 'k', wx - 2, wy - 2, ww + 4, wh + 4);
  px(g, 'k', wx, wy, ww, wh);
  dither(g, 's', wx, wy + Math.round(wh * 0.55), ww, Math.round(wh * 0.45), (x, y) => (y - wy - wh * 0.55) / (wh * 0.45));
  px(g, 'c', wx + ww - 7, wy + 3, 3, 3); px(g, 'k', wx + ww - 6, wy + 3, 2, 2);
  px(g, 'c', wx + 3, wy + 4, 1, 1); px(g, 'h', wx + 9, wy + 7, 1, 1);
  px(g, 'h', wx + Math.round(ww / 2), wy, 1, wh); px(g, 'h', wx, wy + Math.round(wh / 2), ww, 1);
  px(g, 'h', wx - 2, wy + wh + 2, ww + 4, 1);
  // 선반 (편지 칸)
  const sx = Math.round(W * 0.58), sy = Math.round(H * 0.1), cols = 5, rows = 4, cw = 8, ch = 7;
  px(g, 'k', sx - 1, sy - 1, cols * cw + 2, rows * ch + 2);
  const R = rng(9);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = sx + c * cw, y = sy + r * ch;
    px(g, 'h', x, y, cw - 1, ch - 1);
    px(g, 'k', x + 1, y + 1, cw - 3, ch - 3);
    if (R() < 0.7) { px(g, 'c', x + 1, y + 2, cw - 3, 2); if (R() < 0.4) px(g, 'a', x + 3, y + 2, 1, 1); }
  }
  // 카운터
  const kx = Math.round(W * 0.42), ky = Math.round(H * 0.56);
  px(g, 'k', kx - 1, ky - 1, W - kx + 1, floorY - ky + 1);
  px(g, 'h', kx, ky, W - kx, 2);
  px(g, 's', kx, ky + 2, W - kx, floorY - ky - 2);
  for (let x = kx + 4; x < W; x += 10) px(g, 'k', x, ky + 4, 6, floorY - ky - 7), px(g, 'd', x + 1, ky + 5, 4, floorY - ky - 9);
  // 저울·편지 더미
  px(g, 'k', kx + 30, ky - 4, 9, 4); px(g, 'c', kx + 31, ky - 3, 7, 1); px(g, 'h', kx + 31, ky - 2, 7, 1);
  px(g, 'k', kx + 44, ky - 3, 7, 3); px(g, 'c', kx + 45, ky - 2, 5, 1);
  // 매달린 등
  const hx = Math.round(W * 0.5), hy = Math.round(H * 0.24);
  px(g, 'k', hx, 0, 1, hy);
  drawMap(g, SPRITES.iconLamp.slice(4, 15), hx - 8, hy);
  for (let y = hy + 12; y < floorY; y++) {
    const half = (y - hy) * 0.55;
    dither(g, 'a', Math.round(hx - half), y, Math.round(half * 2), 1, (x) => 0.09 * (1 - Math.abs(x - hx) / (half + 1)) + (y > ky - 2 && y < ky + 2 ? 0.15 : 0));
  }
  const catX = kx + 10, catY = ky - 7;
  const apX = Math.round(W * 0.3), apY = floorY - 16;
  return {
    animated: true,
    draw(ctx, t) {
      ctx.drawImage(Ly.c, 0, 0);
      const f = Math.floor(t * FPS);
      ctx.drawImage(spriteCanvas(!reduceMotion && f % 40 < 2 ? 'cat1' : 'cat0'), catX, catY);
      ctx.drawImage(spriteCanvas(!reduceMotion && f % 8 < 3 ? 'apprenticeIdle1' : 'apprenticeIdle0'), apX, apY);
    },
  };
}

/** 스크린샷 2 — 언덕길 계단 */
function alleyVignette(W, H) {
  const Ly = makeLayer(W, H);
  const g = Ly.g;
  px(g, 'k', 0, 0, W, H);
  dither(g, 's', 0, Math.round(H * 0.18), W, Math.round(H * 0.2), (x, y) => (y - H * 0.18) / (H * 0.2));
  px(g, 's', 0, Math.round(H * 0.38), W, H);
  const R = rng(17);
  for (let i = 0; i < 14; i++) px(g, R() < 0.5 ? 'c' : 'h', Math.floor(R() * W), Math.floor(R() * H * 0.2));
  const wins = [];
  // 계단: 왼쪽 아래 → 오른쪽 위
  const stepW = 6, stepH = 3;
  const sx0 = Math.round(W * 0.18), sy0 = H;
  const nSteps = Math.ceil((H * 0.6) / stepH);
  const stair = [];
  for (let i = 0; i < nSteps; i++) stair.push({ x: sx0 + i * stepW, y: sy0 - (i + 1) * stepH });
  // 뒤쪽 집들 (계단 위쪽)
  let x = Math.round(W * 0.02);
  const backBase = Math.round(H * 0.58);
  while (x < W - 14) {
    const w = [13, 15, 13, 11][Math.floor(R() * 4)];
    const hw = [];
    drawHouse(g, x, backBase, { w, wallH: 10, roof: R() < 0.5 ? 'gable' : 'side', wall: 'h', roofCol: R() < 0.6 ? 'd' : 's', chimney: R() < 0.5, windows: w >= 13 ? [6, 9] : [7], doorX: 2 }, hw);
    wins.push(...hw);
    x += w + 3;
  }
  px(g, 'k', 0, backBase, W, H - backBase);
  // 돌담
  for (let y = backBase + 1; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const row = y - backBase;
    const mortar = row % 4 === 0 || ((xx + (Math.floor(row / 4) % 2) * 4) % 8 === 0);
    if (!mortar) px(g, row % 4 === 1 ? 'h' : 's', xx, y);
  }
  // 계단 (앞)
  for (const st of stair) {
    if (st.y < backBase - 2) break;
    px(g, 'k', st.x - 1, st.y - 1, W, H - st.y + 1);
    px(g, 'h', st.x, st.y, W - st.x, 1);
    px(g, 's', st.x, st.y + 1, W - st.x, 2);
  }
  // 앞쪽 큰 집 (오른쪽)
  const fx = Math.round(W * 0.68);
  const fhw = [];
  drawHouse(g, fx, H - 2, { w: Math.max(23, W - fx + 6), wallH: Math.round(H * 0.42), roof: 'side', roofH: 6, wall: 'h', roofCol: 'd', chimney: true, windows: [6, 14], doorX: 3, door: true, porch: true }, fhw);
  wins.push(...fhw);
  // 가로등
  const lpx = Math.round(W * 0.6);
  const lpBase = stair.find((s) => s.x >= lpx - 3)?.y ?? H - 10;
  drawMap(g, SPRITES.lamp, lpx - 2, lpBase - 18);
  const ap = stair[Math.min(stair.length - 1, 5)];
  return {
    animated: true,
    draw(ctx, t) {
      ctx.drawImage(Ly.c, 0, 0);
      for (const wd of wins) { px(ctx, 'a', wd.x, wd.y, wd.w, wd.h); if (wd.h >= 3) px(ctx, 'c', wd.x, wd.y, 1, 1); }
      const f = Math.floor(t * FPS);
      const fr = reduceMotion ? 'apprenticeIdle0' : (f % 8 < 4 ? 'apprenticeWalk0' : 'apprenticeWalk1');
      ctx.drawImage(spriteCanvas(fr), ap.x + 1, ap.y - 16);
      dither(ctx, 'a', ap.x + 4, ap.y, 12, 1, (xx) => 0.6 - Math.abs(xx - ap.x - 10) * 0.1);
    },
  };
}

/** 스크린샷 3 — 등대 꼭대기 */
function lighthouseVignette(W, H) {
  const Ly = makeLayer(W, H);
  const g = Ly.g;
  const hz = Math.round(H * 0.7);
  px(g, 'k', 0, 0, W, hz);
  dither(g, 's', 0, Math.round(hz * 0.5), W, Math.round(hz * 0.5), (x, y) => (y - hz * 0.5) / (hz * 0.5));
  px(g, 'h', 0, hz - 1, W, 1);
  for (let y = hz; y < H; y++) px(g, (y - hz) % 3 === 1 ? 'h' : (y - hz) > 10 && (y - hz) % 2 ? 'k' : 's', 0, y, W, 1);
  const R = rng(4);
  for (let i = 0; i < 16; i++) px(g, R() < 0.5 ? 'c' : 'h', Math.floor(R() * W), Math.floor(R() * hz * 0.45));
  // 먼 마을 불빛 (왼쪽 아래 해안)
  for (let i = 0; i < 18; i++) {
    const x = Math.round(W * 0.04 + R() * W * 0.36), y = hz - 1 - Math.floor(R() * 5);
    px(g, 'k', x - 1, y - 1, 4, hz - y + 1);
    if (R() < 0.7) px(g, 'a', x, y, 1, 1);
  }
  // 등대 상부 (크게, 오른쪽)
  const cx = Math.round(W * 0.74), top = Math.round(H * 0.44);
  for (let y = top; y < H; y++) {
    const half = 12 + Math.round((y - top) * 0.12);
    for (let x = cx - half; x <= cx + half; x++) {
      const edge = x === cx - half || x === cx + half;
      const band = (y - top) % 18 > 11;
      px(g, edge ? 'k' : x <= cx ? (band ? 't' : 'c') : x > cx + half - 4 ? (band ? 'k' : 's') : (band ? 'd' : 'h'), x, y);
    }
  }
  // 회랑 + 난간
  px(g, 'k', cx - 18, top - 2, 37, 3); px(g, 'h', cx - 18, top - 2, 37, 1);
  for (let x = cx - 18; x <= cx + 18; x += 3) px(g, 'k', x, top - 9, 1, 7);
  px(g, 'k', cx - 18, top - 10, 37, 1); px(g, 's', cx - 18, top - 9, 37, 1);
  // 등불실
  const ry = top - 26;
  px(g, 'k', cx - 10, ry, 21, 17);
  // 지붕
  for (let r = 0; r < 7; r++) { px(g, 'k', cx - 12 + r, ry - 1 - r, 25 - r * 2, 1); if (r < 6) px(g, r < 2 ? 't' : 'd', cx - 11 + r, ry - 1 - r, 23 - r * 2 - 2, 1); }
  px(g, 'k', cx, ry - 10, 1, 3);
  const ap = { x: cx - 30, y: top - 18 };
  return {
    animated: true,
    draw(ctx, t) {
      ctx.drawImage(Ly.c, 0, 0);
      const theta = reduceMotion ? -1.2 : t * (Math.PI * 2 / 7);
      const sx = Math.sin(theta), cz = Math.cos(theta);
      const ly = ry + 8;
      // 빛줄기
      const len = Math.round(W * 0.75 * Math.pow(Math.abs(sx), 0.7));
      if (sx < 0 && len > 6) {
        for (let d = 10; d < len; d++) {
          const x = cx - d;
          const half = 2 + d * 0.11;
          const dens = 0.6 * Math.pow(1 - d / len, 0.7);
          for (let yy = Math.floor(ly - half); yy <= Math.ceil(ly + half); yy++) if (dens * (1 - Math.abs(yy - ly) / (half + 1) * 0.6) > bayer(x, yy)) px(ctx, 'h', x, yy);
        }
      }
      // 렌즈
      const bright = cz > 0.9;
      px(ctx, bright ? 'c' : 'a', cx - 9, ry + 1, 19, 15);
      for (let k = 0; k < 4; k++) px(ctx, 'k', cx - 9 + k * 6, ry + 1, 1, 15);
      px(ctx, 'c', cx - 3, ry + 5, 7, 7);
      px(ctx, 'a', cx - 1, ry + 7, 3, 3);
      ctx.drawImage(spriteCanvas('apprenticeIdle0'), ap.x, ap.y);
    },
  };
}

// ── SPRITE CANVASES ([data-sprite]) ───────────────────────────
function paintSprites() {
  document.querySelectorAll('canvas[data-sprite]').forEach((c) => {
    const name = c.dataset.sprite;
    const g = c.getContext('2d');
    const src = ASSETS.sprites?.[name];
    if (src) {
      const img = new Image();
      img.onload = () => { c.width = img.width; c.height = img.height; g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0); };
      img.src = src;
      return;
    }
    const map = SPRITES[name];
    if (!map) return;
    c.width = map[0].length; c.height = map.length;
    g.clearRect(0, 0, c.width, c.height);
    drawMap(g, map, 0, 0, { sub: c.dataset.sub ? JSON.parse(c.dataset.sub) : null });
  });
}

// ── UI ─────────────────────────────────────────────────────────
function initHeader() {
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const list = document.getElementById('site-nav');
  const onScroll = () => {
    const limit = hero ? hero.offsetHeight - innerHeight * 0.2 : 40;
    header.classList.toggle('is-solid', scrollY > limit || list.classList.contains('is-open'));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
    onScroll();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && list.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
}

function initMapLegend() {
  const map = document.querySelector('[data-map]');
  if (!map) return;
  const set = (id) => {
    map.querySelectorAll('[data-pin]').forEach((p) => p.classList.toggle('is-active', p.dataset.pin === id));
    map.querySelectorAll('[data-legend]').forEach((b) => b.classList.toggle('is-active', b.dataset.legend === id));
  };
  map.querySelectorAll('[data-legend]').forEach((b) => {
    b.addEventListener('mouseenter', () => set(b.dataset.legend));
    b.addEventListener('focus', () => set(b.dataset.legend));
    b.addEventListener('click', () => set(b.dataset.legend));
    b.addEventListener('mouseleave', () => { if (document.activeElement !== b) set(null); });
    b.addEventListener('blur', () => set(null));
  });
}

/** 불빛 잇기 미니 퍼즐 (3×3, 누르면 상하좌우도 함께 바뀜) */
function initPuzzle() {
  const root = document.querySelector('[data-puzzle]');
  if (!root) return;
  const count = document.querySelector('[data-puzzle-count]');
  const status = document.querySelector('[data-puzzle-status]');
  const reset = document.querySelector('[data-puzzle-reset]');
  const START = [0, 1, 0, 1, 1, 1, 0, 1, 1]; // 두 번 누르면 풀리는 시작 상태 (가운데 → 오른쪽 아래)
  let state = START.slice();
  const btns = [];
  const draw = (b, on) => {
    const c = b.querySelector('canvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, 16, 16);
    drawMap(g, SPRITES.iconLamp, 0, 0, on ? {} : { sub: { a: 's', c: 'h' } });
  };
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<canvas class="px" width="16" height="16" aria-hidden="true"></canvas>';
    b.setAttribute('aria-label', `${Math.floor(i / 3) + 1}행 ${(i % 3) + 1}열 등불`);
    b.addEventListener('click', () => press(i));
    b.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
      if (!(e.key in map)) return;
      e.preventDefault();
      const j = i + map[e.key];
      if (j >= 0 && j < 9 && !(Math.abs(map[e.key]) === 1 && Math.floor(j / 3) !== Math.floor(i / 3))) btns[j].focus();
    });
    root.appendChild(b);
    btns.push(b);
  }
  const render = () => {
    const n = state.reduce((a, b) => a + b, 0);
    btns.forEach((b, i) => { draw(b, state[i]); b.setAttribute('aria-pressed', String(!!state[i])); });
    count.textContent = `${n}/9`;
    const solved = n === 9;
    status.textContent = solved ? '모든 등불이 이어졌습니다. 등대까지 길이 밝아졌어요.' : '등불을 눌러 아홉 개를 모두 켜 보세요.';
    status.classList.toggle('is-solved', solved);
  };
  function press(i) {
    const r = Math.floor(i / 3), c = i % 3;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) state[rr * 3 + cc] ^= 1;
    });
    render();
  }
  reset.addEventListener('click', () => { state = START.slice(); render(); btns[0].focus(); });
  render();
}

function initTalk() {
  const line = document.querySelector('[data-talk-line]');
  const wrap = document.querySelector('[data-talk-choices]');
  if (!line || !wrap) return;
  const replies = [
    '고맙구먼. 언덕 위 순이 할머니 댁이야. 계단이 미끄러우니 등불을 낮게 들고 가게.',
    '바다 건너 사는 손녀가 보낸 거라네. 할머니가 일 년을 기다린 편지지.',
  ];
  wrap.querySelectorAll('[data-reply]').forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      wrap.querySelectorAll('[data-reply]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      line.textContent = replies[Number(b.dataset.reply)];
    });
  });
}

function initTabs() {
  const root = document.querySelector('[data-tabs]');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault();
      select(tabs[j]);
    });
  });
}

function initTrailer() {
  const dialog = document.querySelector('[data-trailer-dialog]');
  if (!dialog) return;
  const body = dialog.querySelector('[data-modal-body]');
  let opener = null;
  const open = (e) => {
    if (!dialog.showModal) return;
    e.preventDefault();
    opener = e.currentTarget;
    if (ASSETS.trailer && !body.dataset.loaded) {
      body.dataset.loaded = '1';
      const isEmbed = /youtube|vimeo|embed/.test(ASSETS.trailer);
      body.innerHTML = isEmbed
        ? `<iframe src="${ASSETS.trailer}" title="밤항구 공식 트레일러" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${ASSETS.trailer}" controls playsinline preload="metadata"></video>`;
    }
    dialog.showModal();
    body.querySelector('video')?.play?.().catch(() => {});
  };
  document.querySelectorAll('[data-trailer-open]').forEach((el) => {
    // 히어로의 '트레일러 보기'는 영상이 없을 때 영상 섹션으로 이동
    if (el.tagName === 'A' && !ASSETS.trailer) return;
    el.addEventListener('click', open);
  });
  const close = () => dialog.close();
  dialog.querySelector('[data-modal-close]').addEventListener('click', close);
  dialog.querySelector('[data-modal-close-link]').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => { body.querySelector('video')?.pause(); opener?.focus?.(); });
}

function initSubscribe() {
  const form = document.querySelector('[data-subscribe]');
  if (!form) return;
  const email = form.querySelector('input[type="email"]');
  const agree = form.querySelector('input[name="agree"]');
  const msg = form.querySelector('[data-sub-msg]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.classList.remove('is-ok');
    email.removeAttribute('aria-invalid');
    if (!email.value.trim() || !email.validity.valid) {
      email.setAttribute('aria-invalid', 'true');
      msg.textContent = '이메일 주소를 다시 확인해 주세요. 예: nuri@example.com';
      email.focus();
      return;
    }
    if (!agree.checked) {
      msg.textContent = '소식 메일 수신에 동의해 주셔야 구독할 수 있어요.';
      agree.focus();
      return;
    }
    msg.classList.add('is-ok');
    msg.textContent = `구독 신청이 접수되었습니다. ${email.value.trim()}로 확인 메일을 보내 드릴게요. (템플릿 예시: 실제로 전송되지 않습니다)`;
    form.reset();
  });
}

function initLinks() {
  if (!ASSETS.wishlistUrl) return;
  document.querySelectorAll('a.btn--primary').forEach((a) => {
    if (/위시리스트/.test(a.textContent)) { a.href = ASSETS.wishlistUrl; a.target = '_blank'; a.rel = 'noopener'; }
  });
}

function initScreenshots() {
  const canvases = document.querySelectorAll('.shot canvas[data-vignette]');
  canvases.forEach((c, i) => {
    const src = ASSETS.screenshots?.[i];
    if (!src) return;
    const img = new Image();
    img.src = src; img.alt = c.getAttribute('aria-label') || '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    c.replaceWith(img);
  });
  if (ASSETS.trailerPoster) {
    const c = document.querySelector('[data-vignette="trailer"]');
    if (c) { const img = new Image(); img.src = ASSETS.trailerPoster; img.alt = ''; img.className = 'trailer__canvas'; c.replaceWith(img); }
  }
}

function initVignettes() {
  const defs = {
    map: [110, mapVignette],
    roofline: [320, rooflineVignette],
    trailer: [300, trailerVignette],
    finale: [320, finaleVignette],
    postoffice: [150, postofficeVignette],
    alley: [150, alleyVignette],
    lighthouse: [150, lighthouseVignette],
  };
  document.querySelectorAll('canvas[data-vignette]').forEach((c) => {
    const def = defs[c.dataset.vignette];
    if (!def) return;
    registerVignette(c, def[0], def[1]);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kickVignettes(); });
}

// ── START ──────────────────────────────────────────────────────
function start() {
  readPalette();
  paintSprites();
  initHeader();
  initMapLegend();
  initPuzzle();
  initTalk();
  initTabs();
  initTrailer();
  initSubscribe();
  initLinks();
  initScreenshots();
  if (ASSETS.apprenticeSheet) {
    const img = new Image();
    img.onload = () => { heroSheet = img; spriteCache.clear(); };
    img.src = ASSETS.apprenticeSheet;
  }
  const go = () => { initHero(); initVignettes(); };
  // 글꼴이 늦게 와도 그림은 바로 그리고, 글자 위치가 바뀌면 ResizeObserver가 다시 맞춥니다
  go();
  document.fonts?.ready.then(() => window.dispatchEvent(new Event('resize')));
  motionQuery.addEventListener('change', () => { reduceMotion = motionQuery.matches; vignettes.forEach((v) => v.state?.draw(v.ctx, performance.now() / 1000, true)); kickVignettes(); });
}
start();
