/**
 * Signature pieces drawn around a character or a tooltip box: the newer auras' effects and
 * the per-aura tooltip decorations, all in pixels on the renderer's layer buffers.
 */
import { clamp, hslToRgb, noise1, ramp, TAU, type Rgb } from "./math";
import {
  DIAG,
  ORTHO,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  plot,
  RUNES,
} from "./paint";
import type { TipDeco } from "./presets";

/** What a decoration draws with: the layer buffers, the stepped clock and the aura's colours. */
export interface Brush {
  /** Additive layer, for light. */
  lit: CanvasRenderingContext2D;
  /** Covering layer, for opaque things (petals, bone, vines). */
  dim: () => CanvasRenderingContext2D;
  time: number;
  tick: number;
  tones: readonly [Rgb, Rgb, Rgb];
  palette: readonly Rgb[];
  intensity: number;
  /** How far spring-hung props trail the head, px. */
  lag: { x: number; y: number };
}

/** Screen box of the shape: a character's opaque bounds or a tooltip's frame. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pixel sprites: one character per pixel, mapped through a palette; spaces are empty. */
function sprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rows: readonly string[],
  colors: Record<string, Rgb>,
  alpha: number,
): void {
  const left = Math.round(x - (rows[0]?.length ?? 0) / 2);
  const top = Math.round(y - rows.length / 2);

  for (const [dy, row] of rows.entries()) {
    for (let dx = 0; dx < row.length; dx++) {
      const color = colors[row.charAt(dx)];

      if (color) plot(ctx, left + dx, top + dy, color, alpha);
    }
  }
}

const SKULL = [" ### ", "#####", "#o#o#", " ### ", " # # "];

const GHOST = [" ### ", "#####", "#o#o#", "#####", "#####", "# # #"];

const BLOSSOM = [" p ", "pcp", " p "];

const BONE: Rgb = [232, 230, 216];

const CLOUD = [
  "     ####   ####     ",
  "   ######## ######   ",
  " ################### ",
  "#####################",
  " ################### ",
  "   ###  ####  ###    ",
];

/** Storm: a small dark cloud over the head, lit from inside when lightning flashes. */
export function drawCloud(
  b: Brush,
  at: { x: number; y: number },
  flash: number,
): void {
  const lit = flash > 0.4;
  sprite(
    b.dim(),
    at.x,
    at.y,
    CLOUD,
    { "#": lit ? [190, 200, 230] : [64, 70, 92] },
    0.95 * b.intensity,
  );
  // A lighter top edge: the same sprite's first rows, one pixel up.
  sprite(
    b.dim(),
    at.x,
    at.y - 3,
    CLOUD.slice(0, 2),
    { "#": lit ? [255, 255, 255] : [120, 130, 160] },
    0.95 * b.intensity,
  );
}

// --- character effects --------------------------------------------------------------------------

/** Aurora: curtains of light waving behind the character, bright on top, fading downwards. */
export function drawCurtain(
  b: Brush,
  cx: number,
  top: number,
  half: number,
  height: number,
  boost: number,
): void {
  const colors = b.palette.slice(1, 4);

  for (let x = Math.round(cx - half); x <= cx + half; x++) {
    const u = (x - (cx - half)) / (half * 2);
    const edge = 1 - Math.abs(u * 2 - 1);

    const wave =
      Math.sin(x * 0.16 + b.time * 1.6) * 4 +
      noise1(x * 0.05 + b.time * 0.4, 31) * 3;

    const length =
      height * (0.7 + 0.3 * Math.sin(x * 0.09 - b.time)) * (1 + boost * 0.5);

    const color = ramp(colors, clamp(u + Math.sin(b.time * 0.3) * 0.2, 0, 1));
    const start = Math.round(top + wave - boost * 6);

    for (let j = 0; j < length; j += 2) {
      const fall = 1 - j / length;
      // The curtain's hem swings behind a walk, like cloth hung from the top.
      const sway = b.lag.x * 1.2 * (j / length);
      plot(
        b.lit,
        x + sway,
        start + j,
        color,
        fall * fall * edge * 0.75 * b.intensity * (1 + boost),
      );
    }
  }
}

/** Necromancy: two skulls bobbing round the shoulders, passing behind and in front. */
export function drawSkulls(b: Brush, box: Box, front: boolean): void {
  const cx = box.x + box.w / 2;
  const cy = box.y + 2;
  const rx = box.w * 0.6 + 9;
  const blink = b.tick % 23 < 2;
  const eye = blink ? BONE : (b.palette[1] ?? b.tones[1]);

  for (let i = 0; i < 2; i++) {
    const angle = b.time * 0.7 + i * Math.PI;

    if (Math.sin(angle) > 0 !== front) continue;
    // Each skull hangs on the spring a little looser than the last, so they trail a walk apart.
    const slack = 1 + i * 0.6;
    const x = cx + Math.cos(angle) * rx + b.lag.x * slack;

    const y =
      cy + Math.sin(angle) * 3 + Math.sin(b.time * 2 + i) * 2 + b.lag.y * slack;

    if (Math.abs(b.lag.x) > 3)
      sprite(
        b.lit,
        x - b.lag.x * 0.6,
        y - b.lag.y * 0.6,
        SKULL,
        { "#": b.palette[2] ?? b.tones[0] },
        0.3 * b.intensity,
      );
    sprite(b.dim(), x, y, SKULL, { "#": BONE }, 0.95 * b.intensity);
    sprite(b.lit, x, y, SKULL, { o: eye }, b.intensity);
  }
}

/** Arcane: four runes circling the chest on a tilted ring. */
export function drawGlyphOrbit(b: Brush, box: Box, front: boolean): void {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h * 0.5;
  const rx = box.w * 0.7 + 7;
  const ry = rx * 0.3;

  for (let i = 0; i < 4; i++) {
    const angle = b.time * 1.1 + (i * TAU) / 4;
    const depth = Math.sin(angle);

    if (depth > 0 !== front) continue;
    // Runes trail on the spring by how far round the ring they are, fanning out on a walk.
    const slack = 0.6 + i * 0.35;
    const x = Math.round(cx + Math.cos(angle) * rx + b.lag.x * slack);
    const y = Math.round(cy + depth * ry + b.lag.y * slack);
    const glyph = RUNES[(i + Math.floor(b.time / 2)) % RUNES.length] ?? [];
    const color = depth > 0 ? b.tones[0] : b.tones[1];

    for (const [dx, dy] of glyph)
      plot(b.lit, x + dx, y + dy, color, (depth > 0 ? 1 : 0.6) * b.intensity);
  }
}

/** Sandstorm: dashed streaks of sand circling the body at three heights. */
export function drawDustSwirl(b: Brush, box: Box, front: boolean): void {
  const cx = box.x + box.w / 2;

  for (const [level, at] of [0.25, 0.55, 0.85].entries()) {
    const cy = box.y + box.h * at;
    const rx = box.w * 0.6 + 6 + level * 2;
    const ry = rx * 0.25;
    const base = b.time * (3.2 + level * 0.7) + level * 2;

    for (let dash = 0; dash < 3; dash++) {
      for (let s = 0; s < 7; s++) {
        const angle = base + (dash * TAU) / 3 + s * 0.09;
        const depth = Math.sin(angle);

        if (depth > 0 !== front) continue;
        plot(
          b.lit,
          cx + Math.cos(angle) * rx,
          cy + depth * ry,
          s < 2 ? b.tones[0] : b.tones[1],
          (s / 7) * 0.9 * b.intensity,
        );
      }
    }
  }
}

/** Ghosts for the necromancy burst: three souls rising from the ground at staggered starts. */
export function drawSouls(
  b: Brush,
  feetX: number,
  feetY: number,
  progress: number,
  offsets: readonly number[] = [-14, 0, 14],
): void {
  for (const [i, offset] of offsets.entries()) {
    const local = (progress - i * 0.15) / 0.7;

    if (local < 0 || local > 1) continue;
    const x = feetX + offset + Math.sin(local * 9 + i) * 2;
    const y = feetY - 4 - local * 36;

    const a =
      (local < 0.2 ? local / 0.2 : 1 - (local - 0.2) / 0.8) * b.intensity;

    sprite(
      b.lit,
      x,
      y,
      GHOST,
      { "#": b.palette[0] ?? b.tones[0], o: [10, 40, 16] },
      a * 0.85,
    );
  }
}

// --- tooltip decorations --------------------------------------------------------------------------

/** A corner of the tooltip box and the direction pointing out of it. */
type BoxCorner = [x: number, y: number, sx: number, sy: number];

/** One tooltip decoration frame: the brush, the box edges and the aura's tones. */
interface TipFrame {
  b: Brush;
  deco: TipDeco;
  L: number;
  T: number;
  W: number;
  H: number;
  /** Right and bottom pixel columns of the box. */
  R: number;
  B: number;
  corners: BoxCorner[];
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
  a: number;
  boost: number;
}

/** Gold diamonds on the corners and a small cross over the top edge. */
function drawHolyCorners({
  b,
  L,
  T,
  W,
  corners,
  light,
  mid,
  a,
}: TipFrame): void {
  for (const [i, [x, y, sx, sy]] of corners.entries()) {
    const cx = x + sx * 2;
    const cy = y + sy * 2;

    for (let r = 0; r <= 2; r++) {
      for (const [dx, dy] of [
        [r, 2 - r],
        [-r, 2 - r],
        [r, r - 2],
        [-r, r - 2],
      ] as const)
        plot(b.lit, cx + dx, cy + dy, mid, a);
    }

    plot(b.lit, cx, cy, light, a);

    if ((b.tick + i * 5) % 20 < 3)
      pixelGlint(b.lit, cx, cy, 2, [255, 255, 255], light, a);
  }

  for (let i = 0; i < 7; i++)
    plot(b.lit, L + W / 2, T - 3 - i, i < 2 ? mid : light, a);

  for (let i = -2; i <= 2; i++) plot(b.lit, L + W / 2 + i, T - 7, light, a);
}

/** Icicles of varied length hanging off the bottom edge, growing and melting slowly. */
function drawIcicles({ b, L, R, B, light, mid, dark, a }: TipFrame): void {
  for (let x = L + 3, i = 0; x < R - 2; x += 6, i++) {
    const length = Math.round(
      3 + ((i * 7919) % 5) + Math.sin(b.time * 0.6 + i) * 1.5,
    );

    for (let j = 0; j < length; j++) {
      const color = j < 2 ? light : j < length - 1 ? mid : dark;
      plot(b.lit, x, B + 1 + j, color, a);

      if (j < 2) plot(b.lit, x + 1, B + 1 + j, mid, a * 0.8);
    }

    if ((b.tick + i * 7) % 30 === 0)
      pixelGlint(b.lit, x, B + length, 1, [255, 255, 255], light, a);
  }
}

/** Dark tendrils creeping out of each corner, curling with the clock. */
function drawTendrils({ b, corners, light, a }: TipFrame): void {
  for (const [i, [x, y, sx, sy]] of corners.entries()) {
    for (const spread of [-0.6, 0.6]) {
      const dx = sx * Math.cos(spread) - sy * Math.sin(spread) * 0.4;
      const dy = sy * Math.cos(spread) + sx * Math.sin(spread) * 0.4;

      for (let s = 0; s < 16; s++) {
        const u = s / 16;
        const curl = Math.sin(u * 6 + b.time * 2 + i + spread) * 3 * u;
        const px = x + dx * s + -dy * curl;
        const py = y + dy * s + dx * curl;
        plot(b.dim(), px, py, [30, 6, 48], (1 - u) * 0.9 * a);

        if (s > 12) plot(b.lit, px, py, light, (1 - u) * 1.5 * a);
      }
    }
  }
}

/** A zigzag spark jumps off a corner every few ticks. */
function drawBoltCorners({ b, corners, light, a }: TipFrame): void {
  for (const [i, [x, y, sx, sy]] of corners.entries()) {
    if ((b.tick + i * 4) % 9 > 1) continue;
    let px = x + sx;
    let py = y + sy;

    for (let k = 0; k < 4; k++) {
      const nx = px + sx * (2 + (k % 2) * 2);
      const ny = py + sy * (k % 2 ? 1 : 3);
      pixelLine(
        b.lit,
        px,
        py,
        nx,
        ny,
        k < 2 ? [255, 255, 255] : light,
        a,
        a * 0.7,
      );
      px = nx;
      py = ny;
    }
  }
}

/** Beads swelling under the bottom edge before they fall (the falling drops are particles). */
function drawDrips({ b, deco, L, R, B, mid, a }: TipFrame): void {
  const color = deco === "drips" ? mid : (b.palette[1] ?? mid);

  for (let x = L + 5, i = 0; x < R - 3; x += 9, i++) {
    const swell = ((b.time * 0.7 + i * 0.37) % 1) * 3;

    for (let j = 0; j < swell; j++) plot(b.lit, x, B + 1 + j, color, a);

    if (swell > 2) plot(b.lit, x - 1, B + 3, color, a * 0.6);
  }
}

/** Stars just outside the frame, joined by faint lines; each twinkles on its own beat. */
function drawConstellation({
  b,
  L,
  T,
  W,
  H,
  R,
  B,
  light,
  dark,
  a,
}: TipFrame): void {
  const stars: [number, number][] = [
    [L - 6, T + H * 0.3],
    [L + W * 0.2, T - 7],
    [L + W * 0.55, T - 4],
    [R + 7, T + H * 0.2],
    [R + 4, B - H * 0.2],
    [L + W * 0.7, B + 7],
    [L + W * 0.3, B + 5],
    [L - 4, B - 2],
  ];

  for (const [i, [x0, y0]] of stars.entries()) {
    const [x1, y1] = stars[(i + 1) % stars.length] ?? [x0, y0];
    pixelLine(b.lit, x0, y0, x1, y1, dark, 0.35 * a, 0.35 * a);
  }

  for (const [i, [x, y]] of stars.entries())
    pixelGlint(
      b.lit,
      x,
      y,
      (b.tick + i * 3) % 12 < 3 ? 2 : 1,
      [255, 255, 255],
      light,
      a,
    );
}

function drawPrismCorners({ b, corners, a }: TipFrame): void {
  for (const [i, [x, y, sx, sy]] of corners.entries()) {
    const color = hslToRgb(b.time * 120 + i * 90, 1, 0.65);
    const cx = x + sx * 3;
    const cy = y + sy * 3;

    for (let r = -3; r <= 3; r++)
      plot(b.lit, cx, cy + r, Math.abs(r) < 2 ? [255, 255, 255] : color, a);

    for (const [dx, dy] of [...ORTHO, ...DIAG])
      plot(b.lit, cx + dx, cy + dy, color, a * 0.7);
  }
}

/** A vine along the top edge and down the left one, leaves nodding a pixel each few ticks. */
function drawVines({ b, L, T, R, B, light, mid, a }: TipFrame): void {
  const path: [number, number, number, number][] = [];

  for (let x = R - 4; x >= L; x -= 1) path.push([x, T - 2, 0, -1]);

  for (let y = T; y <= B - 4; y += 1) path.push([L - 2, y, -1, 0]);

  for (const [i, [x, y, nx, ny]] of path.entries()) {
    const wave = Math.round(Math.sin(i * 0.35) * 1.2);
    const px = x + nx * wave;
    const py = y + ny * wave;
    plot(b.dim(), px, py, [58, 110, 40], a);

    if (i % 7 === 0) {
      const nod = (b.tick + i) % 16 < 8 ? 1 : 0;
      plot(
        b.dim(),
        px + nx * 2 + (ny ? nod : 0),
        py + ny * 2 + (nx ? nod : 0),
        b.palette[4] ?? mid,
        a,
      );
      plot(b.dim(), px + nx * 1, py + ny * 1, b.palette[3] ?? mid, a);
    }

    if (i % 23 === 11)
      plot(b.lit, px + nx * 2, py + ny * 2, b.palette[2] ?? light, a);
  }
}

/** Cherry branches reaching in over the top corners, blossoms swaying a pixel. */
function drawBlossoms({ b, L, T, R, mid, a }: TipFrame): void {
  for (const [x, sx] of [
    [L, -1],
    [R, 1],
  ] as const) {
    for (let s = 0; s < 14; s++)
      plot(
        b.dim(),
        x + sx * (3 - s * 0.6),
        T - 3 - Math.round(s * 0.35),
        [92, 52, 40],
        a,
      );

    for (let k = 0; k < 3; k++) {
      const bx = x + sx * (3 - k * 4);
      const by = T - 4 - k * 2 + ((b.tick + k * 5) % 14 < 7 ? 0 : 1);
      sprite(
        b.dim(),
        bx,
        by,
        BLOSSOM,
        { p: b.palette[1] ?? mid, c: [255, 230, 140] },
        a,
      );
    }
  }
}

/** Streaks of sand blowing across the top edge, left to right. */
function drawSand({ b, L, T, W, light, mid, a }: TipFrame): void {
  for (let k = 0; k < 5; k++) {
    const x = L - 10 + ((b.time * 60 + k * 37) % (W + 20));
    const y = T - 3 - (k % 3) * 2;

    for (let s = 0; s < 6; s++)
      plot(b.lit, x - s, y, s < 2 ? light : mid, (1 - s / 6) * a);
  }
}

function drawSkullCorners({ b, corners, mid, a }: TipFrame): void {
  for (const [i, [x, y, sx, sy]] of corners.entries()) {
    const cx = x + sx * 3;
    const cy = y + sy * 3;
    sprite(b.dim(), cx, cy, SKULL, { "#": BONE }, a);
    sprite(
      b.lit,
      cx,
      cy,
      SKULL,
      { o: (b.tick + i * 6) % 25 < 2 ? BONE : (b.palette[1] ?? mid) },
      a,
    );
  }
}

/** A rolling wave along the bottom edge, white foam on the crests. */
function drawWaves({ b, L, R, B, light, mid, dark, a }: TipFrame): void {
  for (let x = L - 2; x <= R + 2; x++) {
    const phase = x * 0.3 - b.time * 4;
    const y = Math.round(B + 3 + Math.sin(phase) * 1.6);
    plot(b.lit, x, y, Math.sin(phase) < -0.7 ? [255, 255, 255] : light, a);
    plot(b.lit, x, y + 1, mid, a * 0.8);
    plot(b.lit, x, y + 2, dark, a * 0.5);
  }
}

/** Runes travelling round the frame, a little outside it. */
function drawSigils({ b, L, T, W, H, R, B, light, mid, a }: TipFrame): void {
  const perimeter = 2 * (W + H);

  for (let i = 0; i < 6; i++) {
    let d = (b.time * 24 + (i * perimeter) / 6) % perimeter;
    let x: number;
    let y: number;

    if (d < W) [x, y] = [L + d, T - 5];
    else if ((d -= W) < H) [x, y] = [R + 5, T + d];
    else if ((d -= H) < W) [x, y] = [R - d, B + 5];
    else [x, y] = [L - 5, B - (d - W)];
    const glyph = RUNES[(i + Math.floor(b.time)) % RUNES.length] ?? [];

    for (const [dx, dy] of glyph)
      plot(b.lit, x + dx, y + dy, i % 2 ? light : (b.palette[3] ?? mid), a);
  }
}

function drawTipCurtain({ b, L, T, W, boost }: TipFrame): void {
  drawCurtain(b, L + W / 2, T - 24, W / 2 + 6, 26, boost);
}

/**
 * How each decoration draws and on which pass: `front` decorations may overlap the box,
 * the others sit behind it. Embers are all particles, so their tip draws nothing here.
 */
const TIP_DECO_PAINTERS: Record<
  TipDeco,
  { front: boolean; draw: (frame: TipFrame) => void } | null
> = {
  "holy-corners": { front: true, draw: drawHolyCorners },
  embers: null,
  icicles: { front: true, draw: drawIcicles },
  tendrils: { front: false, draw: drawTendrils },
  "bolt-corners": { front: true, draw: drawBoltCorners },
  drips: { front: true, draw: drawDrips },
  "blood-drips": { front: true, draw: drawDrips },
  constellation: { front: false, draw: drawConstellation },
  "prism-corners": { front: true, draw: drawPrismCorners },
  vines: { front: false, draw: drawVines },
  blossoms: { front: true, draw: drawBlossoms },
  sand: { front: true, draw: drawSand },
  "skull-corners": { front: true, draw: drawSkullCorners },
  waves: { front: true, draw: drawWaves },
  sigils: { front: true, draw: drawSigils },
  curtain: { front: false, draw: drawTipCurtain },
};

/** The aura's own dressing round a tooltip box; `front` draws what may overlap the box. */
export function drawTipDeco(
  b: Brush,
  deco: TipDeco,
  box: Box,
  front: boolean,
  boost: number,
): void {
  const painter = TIP_DECO_PAINTERS[deco];

  if (!painter || painter.front !== front) return;
  const { x: L, y: T, w: W, h: H } = box;
  const R = L + W - 1;
  const B = T + H - 1;
  const [light, mid, dark] = b.tones;

  painter.draw({
    b,
    deco,
    L,
    T,
    W,
    H,
    R,
    B,
    corners: [
      [L, T, -1, -1],
      [R, T, 1, -1],
      [L, B, -1, 1],
      [R, B, 1, 1],
    ],
    light,
    mid,
    dark,
    a: b.intensity,
    boost,
  });
}

/** The arcane circle: two rings, a turning pentagram and runes between the rings. */
export function drawMagicCircle(
  b: Brush,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number,
): void {
  const [light, mid] = b.tones;
  pixelEllipse(b.lit, cx, cy, rx, ry, light, alpha, 0, 1);
  pixelEllipse(
    b.lit,
    cx,
    cy,
    Math.round(rx * 0.78),
    Math.round(ry * 0.78),
    mid,
    alpha * 0.8,
    0,
    1,
  );
  const points: [number, number][] = [];

  for (let i = 0; i < 5; i++) {
    const angle = b.time * 0.5 + (i * TAU) / 5;
    points.push([
      cx + Math.cos(angle) * rx * 0.78,
      cy + Math.sin(angle) * ry * 0.78,
    ]);
  }

  for (const [i, [x0, y0]] of points.entries()) {
    const [x1, y1] = points[(i + 2) % 5] ?? [x0, y0];
    pixelLine(b.lit, x0, y0, x1, y1, mid, alpha * 0.8, alpha * 0.8);
  }
}
