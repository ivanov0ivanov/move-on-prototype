/**
 * Procedural goal-tree renderer (inline SVG).
 *
 * Stages: 0 seed, 1 sprout, 2 small plant, 3 young tree, 4 leafy tree, 5 full crown, 6 crown with fruits.
 * Wilt:   0 healthy, 1 slightly wilted, 2 wilted. The tree never dies.
 * Every change animates through CSS transitions defined in styles.css (section "Tree").
 *
 * @example
 *   renderTree(el, { stage: 0 });            // first call renders instantly
 *   renderTree(el, { stage: 1 }).celebrate(); // later calls animate
 */

const NS = 'http://www.w3.org/2000/svg';
const BX = 120;
const BY = 200;

/** Camera zoom per stage, so small plants still read well; it pulls back as the tree grows. */
const CAMERA = [2.6, 2, 1.7, 1.16, 1.07, 1, 1];
/** Tighter camera for small thumbnails (widget, history), where small plants would be unreadable. */
const CAMERA_MINI = [3.2, 2.7, 2.1, 1.4, 1.17, 1.04, 1.04];
/** Scale of the tree body (trunk + crown) per stage. */
const TREE_SCALE = [0.5, 0.5, 0.5, 0.64, 0.82, 1, 1];
/** Ground shadow width factor per stage. */
const SHADOW = [0.42, 0.42, 0.55, 0.7, 0.85, 1, 1];
/** Sprout stem vertical scale for stages 0..2 (stem path is 26 units tall). */
const STEM = [0, 1, 1.95];

const PALETTES = [
  { lf1: '#2E7D4F', lf2: '#3FA66B', lf3: '#7BC67E', lf4: '#C3E8B2', trunk: '#7A5536', trunkHi: '#9C7550', grass: '#5DAE70', fruit: '#F2C230', fruitShade: '#D69E12' },
  { lf1: '#5C7A45', lf2: '#86995A', lf3: '#B3B97C', lf4: '#DCDBAB', trunk: '#76593E', trunkHi: '#957556', grass: '#8FA35E', fruit: '#E2BC55', fruitShade: '#BE9A3A' },
  { lf1: '#7A6F42', lf2: '#A89B5C', lf3: '#C9B37A', lf4: '#E8D9AE', trunk: '#6E5A44', trunkHi: '#8B755B', grass: '#B2A169', fruit: '#CDB06A', fruitShade: '#A88E4E' },
];

/** Crown clusters: [x, y, r, minStage, thinsWhenWilted]. Drawn top to bottom for depth. */
const CLUSTERS = [
  [120, 60, 24, 3], [100, 80, 26, 3], [141, 78, 25, 3], [120, 99, 29, 3],
  [95, 52, 20, 4, 1], [147, 50, 20, 4, 1], [79, 99, 22, 4], [162, 96, 22, 4], [97, 119, 21, 4], [144, 118, 21, 4],
  [120, 34, 20, 5, 1], [67, 78, 18, 5, 1], [174, 76, 18, 5, 1], [72, 117, 16, 5], [169, 115, 16, 5], [120, 126, 22, 5],
].sort((a, b) => a[1] - b[1]);

const FRUITS = [[98, 112], [147, 108], [121, 90], [80, 93], [161, 88], [108, 63], [137, 125], [134, 58]];
const BLOSSOMS = [[118, 40], [70, 110], [171, 106]];

/** Sprout leaves: per stage 0..2 -> [x, y, angleDeg, scale]; `droop` is the wilt rotation per level. */
const SPROUT_LEAVES = [
  { droop: -24, frames: [[120, 200, -150, 0], [120, 176, -152, 1], [120, 182, -162, 0.95]] },
  { droop: 24, frames: [[120, 200, -30, 0], [120, 176, -28, 1], [120, 182, -18, 0.95]] },
  { droop: -22, frames: [[120, 176, -140, 0], [120, 176, -140, 0], [120, 165, -148, 0.85]] },
  { droop: 22, frames: [[120, 176, -40, 0], [120, 176, -40, 0], [120, 160, -34, 0.85]] },
  { droop: 30, frames: [[120, 176, -90, 0], [120, 176, -90, 0], [120, 150, -78, 0.72]] },
];

const FALLEN = [[96, 203, -12, 1], [146, 204, 18, 2], [109, 206, 172, 2]];

const LEAF_D = 'M0,0 C7,-9 17,-10 24,0 C17,9 7,8 0,0Z';
const LEAF_TOP_D = 'M0,0 C7,-9 17,-10 24,0 L0,0Z';

/* ---------- geometry helpers ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => n.toFixed(1);

/** Organic closed blob: jittered polygon smoothed with Catmull-Rom splines. */
function blobPath(cx, cy, r, rng, n = 9, wobble = 0.1) {
  const pts = [];
  const rot = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.35;
    const rr = r * (1 - wobble + rng() * wobble * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** Tapered, slightly bent limb as a filled path (w1/w2 are half widths). */
function limb(x1, y1, x2, y2, w1, w2, bend = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const cx = (x1 + x2) / 2 + nx * bend;
  const cy = (y1 + y2) / 2 + ny * bend;
  const wm = (w1 + w2) / 2;
  const p = (x, y) => `${f(x)},${f(y)}`;
  return `M${p(x1 + nx * w1, y1 + ny * w1)} Q${p(cx + nx * wm, cy + ny * wm)} ${p(x2 + nx * w2, y2 + ny * w2)} `
    + `L${p(x2 - nx * w2, y2 - ny * w2)} Q${p(cx - nx * wm, cy - ny * wm)} ${p(x1 - nx * w1, y1 - ny * w1)}Z`;
}

function node(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function leaf(parent, cls = '') {
  const g = node('g', { class: `t-leaf ${cls}` }, parent);
  node('path', { d: LEAF_D, class: 'f2' }, g);
  node('path', { d: LEAF_TOP_D, class: 'f3' }, g);
  node('path', { d: 'M2,0 Q12,-1 21,0', class: 't-rib' }, g);
  return g;
}

function tuft(parent, x, y, s) {
  const d = [
    `M${x},${y} q${-1 * s},${-5 * s} ${-4 * s},${-8 * s}`,
    `M${x + 1},${y} q${0.5 * s},${-7 * s} ${1.5 * s},${-11 * s}`,
    `M${x + 2},${y} q${2 * s},${-4 * s} ${5 * s},${-6 * s}`,
  ].join(' ');
  node('path', { d, class: 't-grass' }, parent);
}

/* ---------- scene ---------- */

function build(host, { idle, ground, mini }) {
  const camTable = mini ? CAMERA_MINI : CAMERA;
  const svg = node('svg', {
    viewBox: '0 0 240 240', class: `tree-svg${idle ? '' : ' no-idle'}`, role: 'img',
    preserveAspectRatio: 'xMidYMax meet', 'aria-label': 'Дерево цілі',
  });
  const parts = { clusters: [], sprout: [], fruits: [], fallen: [] };

  if (ground) {
    node('ellipse', { cx: BX, cy: 206, rx: 104, ry: 13, class: 't-ground' }, svg);
    parts.shadow = node('ellipse', { cx: BX, cy: 204, rx: 64, ry: 7, class: 't-shadow' }, svg);
  }

  if (ground) {
    tuft(svg, 70, 206, 1);
    tuft(svg, 166, 207, 0.85);
  }

  const camera = node('g', { class: 't-camera' }, svg);
  parts.camera = camera;

  // Soil mound with a half-buried seed.
  node('path', { d: 'M96,204 C100,196 110,192.5 120,192.5 C130,192.5 140,196 144,204 Z', class: 't-soil' }, camera);
  node('path', { d: 'M104,197.5 C110,194.6 130,194.6 136,197.5', class: 't-soil-hi' }, camera);
  const seed = node('g', { class: 't-seed' }, camera);
  const seedBody = node('g', { transform: 'translate(120 193) rotate(-24)' }, seed);
  node('ellipse', { cx: 0, cy: 0, rx: 8.5, ry: 6, class: 't-seed-body' }, seedBody);
  node('ellipse', { cx: -2.6, cy: -2.1, rx: 3.2, ry: 1.5, class: 't-seed-hi' }, seedBody);
  node('path', { d: 'M-6,0.8 Q0,2.6 6,0.8', class: 't-seed-seam' }, seedBody);
  node('path', { d: 'M106,201 C112,197.6 128,197.6 134,201 L135,204 L105,204Z', class: 't-soil-front' }, camera);
  node('circle', { cx: 103, cy: 202, r: 1.3, class: 't-pebble' }, camera);
  node('circle', { cx: 138, cy: 202.5, r: 1.1, class: 't-pebble' }, camera);
  parts.seed = seed;

  // Sprout / small plant.
  const plant = node('g', { class: 't-plant' }, camera);
  const plantSway = node('g', { class: 't-plant-sway' }, plant);
  parts.stem = node('path', { d: 'M120,201 C119,193 121,183 120,174', class: 't-stem', 'vector-effect': 'non-scaling-stroke' }, plantSway);
  SPROUT_LEAVES.forEach(() => parts.sprout.push(leaf(plantSway)));
  parts.plant = plant;

  // Tree body.
  const tree = node('g', { class: 't-tree' }, camera);
  parts.tree = tree;
  FALLEN.forEach(([x, y, a, minWilt]) => {
    const g = leaf(tree, 't-fallen');
    parts.fallen.push({ g, x, y, a, minWilt });
  });
  const sway = node('g', { class: 't-sway' }, tree);
  // Separate paths: overlapping subpaths in one `d` would cancel out under the nonzero fill rule.
  [
    limb(120, 203, 120, 92, 8, 2.8, -1.5),
    'M105,204 Q114,200 115,189 L125,189 Q126,200 136,204 Z',
    limb(119, 152, 89, 110, 3.4, 1.2, 4),
    limb(121, 139, 153, 103, 3.1, 1.1, -4),
    limb(120, 120, 101, 85, 2.3, 0.9, 3),
    limb(120, 113, 141, 79, 2.3, 0.9, -3),
  ].forEach((d) => node('path', { d, class: 't-trunk' }, sway));
  node('path', { d: limb(116.6, 199, 118.4, 124, 2.2, 0.7, -1), class: 't-trunk-hi' }, sway);

  const crown = node('g', { class: 't-crown' }, sway);
  parts.crown = crown;
  CLUSTERS.forEach(([x, y, r, min, thin], i) => {
    const rng = mulberry32(97 + i * 131);
    const g = node('g', { class: 't-cluster' }, crown);
    // Edge leaves poking out of outer clusters.
    if (min >= 4) {
      const ang = Math.atan2(y - 82, x - BX);
      [-0.5, 0.45].forEach((da, k) => {
        const a = ang + da;
        const lx = x + Math.cos(a) * r * 0.78;
        const ly = y + Math.sin(a) * r * 0.78;
        const lg = node('g', { transform: `translate(${f(lx)} ${f(ly)}) rotate(${f((a * 180) / Math.PI)}) scale(${k ? 0.5 : 0.58})` }, g);
        node('path', { d: LEAF_D, class: 'f2' }, lg);
        node('path', { d: LEAF_TOP_D, class: 'f3' }, lg);
      });
    }
    node('path', { d: blobPath(x, y, r, rng), class: 'f1' }, g);
    node('path', { d: blobPath(x - r * 0.08, y - r * 0.13, r * 0.84, rng), class: 'f2' }, g);
    node('path', { d: blobPath(x - r * 0.3, y - r * 0.34, r * 0.46, rng, 8, 0.14), class: 'f3' }, g);
    if (r >= 20) node('circle', { cx: f(x - r * 0.44), cy: f(y - r * 0.52), r: f(r * 0.12), class: 'f4' }, g);
    parts.clusters.push({ g, min, thin: !!thin });
  });

  const fruitLayer = node('g', { class: 't-fruits' }, sway);
  FRUITS.forEach(([x, y]) => {
    const g = node('g', { class: 't-fruit' }, fruitLayer);
    node('path', { d: `M${x},${y - 5} q1,-2.6 2.4,-3.4`, class: 't-fruit-stem' }, g);
    node('circle', { cx: x, cy: y, r: 5.2, class: 't-fruit-body' }, g);
    node('path', { d: `M${x + 4.6},${y + 1.6} A5.2,5.2 0 0 1 ${x - 3.4},${y + 3.9} A6,6 0 0 0 ${x + 4.6},${y + 1.6}Z`, class: 't-fruit-shade' }, g);
    node('circle', { cx: x - 1.8, cy: y - 1.9, r: 1.5, class: 't-fruit-hi' }, g);
    parts.fruits.push(g);
  });
  BLOSSOMS.forEach(([x, y]) => {
    const g = node('g', { class: 't-fruit' }, fruitLayer);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      node('ellipse', {
        cx: f(x + Math.cos(a) * 3.2), cy: f(y + Math.sin(a) * 3.2), rx: 2.6, ry: 1.9,
        transform: `rotate(${f((a * 180) / Math.PI)} ${f(x + Math.cos(a) * 3.2)} ${f(y + Math.sin(a) * 3.2)})`, class: 't-petal',
      }, g);
    }
    node('circle', { cx: x, cy: y, r: 1.8, class: 't-fruit-body' }, g);
    parts.fruits.push(g);
  });

  const sparks = node('g', { class: 't-sparks' }, svg);
  host.replaceChildren(svg);

  const ctl = { svg, stage: null, wilt: null };

  ctl.set = (stage, wilt, instant) => {
    if (instant) svg.classList.add('t-instant');
    const prev = ctl.stage == null ? stage : ctl.stage;
    apply(svg, parts, stage, wilt, prev, camTable);
    ctl.stage = stage;
    ctl.wilt = wilt;
    if (instant) {
      svg.getBoundingClientRect();
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('t-instant')));
    }
  };

  /** Small rising particles around the foliage, used on growth and recovery. */
  ctl.celebrate = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const s = ctl.stage ?? 0;
    let fy = s === 0 ? 190 : s === 1 ? 170 : s === 2 ? 158 : 82;
    if (s >= 3) fy = BY + (fy - BY) * TREE_SCALE[s];
    fy = BY + (fy - BY) * camTable[s];
    const spread = s >= 3 ? 70 : 34;
    const colors = ['#F2C230', '#7BC67E', '#F2C230', '#FDECB0', '#3FA66B', '#F2C230', '#7BC67E'];
    colors.forEach((c, i) => {
      const x = BX + (i / (colors.length - 1) - 0.5) * spread * 2 + (Math.random() - 0.5) * 10;
      const y = fy + (Math.random() - 0.5) * spread * 0.7;
      const dot = node('circle', { cx: f(x), cy: f(y), r: f(2 + Math.random() * 2.2), fill: c, class: 't-spark' }, sparks);
      dot.style.animationDelay = `${i * 70}ms`;
      setTimeout(() => dot.remove(), 1700 + i * 70);
    });
  };

  return ctl;
}

function setT(elm, transform, opacity, delay = 0) {
  elm.style.transform = transform;
  if (opacity != null) elm.style.opacity = String(opacity);
  elm.style.transitionDelay = `${delay}ms`;
}

function apply(svg, parts, stage, wilt, prev, camTable) {
  const pal = PALETTES[wilt];
  for (const k in pal) svg.style.setProperty(`--${k}`, pal[k]);
  svg.dataset.stage = String(stage);
  svg.dataset.wilt = String(wilt);
  const growing = stage > prev;

  setT(parts.camera, `scale(${camTable[stage]})`);
  if (parts.shadow) setT(parts.shadow, `scaleX(${SHADOW[stage]})`);

  // Seed.
  setT(parts.seed, stage === 0 ? 'none' : 'translateY(5px) scale(0.6)', stage === 0 ? 1 : 0);

  // Sprout and small plant.
  const sp = Math.min(stage, 2);
  setT(parts.stem, `scaleY(${STEM[sp]})`, null, growing && prev === 0 ? 120 : 0);
  setT(parts.plant, 'none', stage >= 3 ? 0 : 1);
  parts.sprout.forEach((g, i) => {
    const spec = SPROUT_LEAVES[i];
    const [x, y, a, s] = spec.frames[sp];
    const angle = a + spec.droop * wilt;
    const delay = growing && stage <= 2 ? 380 + i * 90 : 0;
    setT(g, `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${s})`, s ? 1 : 0, delay);
  });

  // Tree body.
  setT(parts.tree, `scale(${TREE_SCALE[stage]})`, stage >= 3 ? 1 : 0, growing && stage === 3 ? 150 : 0);
  setT(parts.crown, wilt ? `translateY(${wilt * 2.6}px) scale(${1 + wilt * 0.01}, ${1 - wilt * 0.035})` : 'none');

  let order = 0;
  parts.clusters.forEach(({ g, min, thin }) => {
    const visible = stage >= min;
    const wasVisible = prev >= min;
    const delay = visible && !wasVisible && growing ? 260 + order++ * 55 : 0;
    const scale = !visible ? 0 : thin && wilt === 2 ? 0.8 : wilt === 1 && thin ? 0.92 : 1;
    setT(g, `scale(${scale})`, visible ? 1 : 0, delay);
  });

  parts.fruits.forEach((g, i) => {
    const visible = stage >= 6;
    const delay = visible && prev < 6 ? 500 + i * 80 : 0;
    const droop = wilt === 2 && i % 3 === 0;
    setT(g, visible ? (droop ? 'translateY(3px) scale(0.75)' : 'scale(1)') : 'scale(0)', visible ? (wilt ? 0.85 : 1) : 0, delay);
  });

  parts.fallen.forEach(({ g, x, y, a, minWilt }, i) => {
    const show = stage >= 3 && wilt >= minWilt;
    const t = show
      ? `translate(${x}px, ${y}px) rotate(${a}deg) scale(0.75)`
      : `translate(${x}px, ${y - 46}px) rotate(${a - 50}deg) scale(0.75)`;
    setT(g, t, show ? 1 : 0, show ? 200 + i * 220 : 0);
  });
}

/**
 * Renders the tree into `host` or updates the existing one with an animated transition.
 * @param {HTMLElement} host
 * @param {{stage?: number, wilt?: number, instant?: boolean, idle?: boolean, ground?: boolean, mini?: boolean}} [opts]
 *   `idle` enables the gentle sway; `mini` uses a tighter camera for thumbnails. Both apply on first render only.
 * @returns {{svg: SVGSVGElement, stage: number, wilt: number, set: Function, celebrate: Function}}
 */
export function renderTree(host, { stage = 0, wilt = 0, instant = false, idle = true, ground = true, mini = false } = {}) {
  const clampStage = Math.max(0, Math.min(6, Math.round(stage)));
  const clampWilt = Math.max(0, Math.min(2, Math.round(wilt)));
  let ctl = host.__tree;
  if (!ctl) {
    ctl = build(host, { idle, ground, mini });
    host.__tree = ctl;
    instant = true;
  }
  ctl.set(clampStage, clampWilt, instant);
  return ctl;
}
