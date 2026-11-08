/**
 * The Heavenly Dragon: an eastern dragon chasing a glowing pearl round the character. The
 * pearl follows a path; the head steers after it with a capped turn rate, so it swoops and
 * overshoots; the body follows the head segment by segment. Simulated in 3D (z towards the
 * viewer) so the dragon really passes behind and in front of the character.
 */
import { clamp } from "es-toolkit";
import type { Brush } from "./decor";
import { rgba, type Rgb } from "./math";
import { pixelDisc, pixelLine, plot, softEllipse } from "./paint";

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** Screen squash of depth: z shifts a point down by this share, as a tilted view would. */
const DEPTH_TILT = 0.22;

export class Dragon {
  /** Head first, then the body to the tail. */
  readonly segments: Point3[];
  readonly head: Point3;
  /** Unit heading of the head. */
  private dir: Point3 = { x: 1, y: 0, z: 0 };

  constructor(
    start: Point3,
    readonly count = 28,
    readonly spacing = 2.2,
  ) {
    this.head = { ...start };
    this.segments = [
      this.head,
      ...Array.from({ length: count - 1 }, (_, i) => ({
        x: start.x - (i + 1) * spacing,
        y: start.y,
        z: start.z,
      })),
    ];
  }

  get heading(): Point3 {
    return this.dir;
  }

  /**
   * Advances `dt` seconds chasing `pearl`: the head turns towards it at most `turnRate` rad/s
   * and flies faster the farther it is; every segment then keeps `spacing` from the one before.
   */
  step(pearl: Point3, dt: number, turnRate = 5, substeps = 4): void {
    const h = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      const head = this.head;
      const tx = pearl.x - head.x;
      const ty = pearl.y - head.y;
      const tz = pearl.z - head.z;
      const dist = Math.hypot(tx, ty, tz) || 1e-6;
      this.turn(tx / dist, ty / dist, tz / dist, turnRate * h);
      const speed = clamp(dist * 4, 26, 110);
      head.x += this.dir.x * speed * h;
      head.y += this.dir.y * speed * h;
      head.z += this.dir.z * speed * h;

      let prev = head;

      for (const seg of this.segments) {
        if (seg === head) continue;
        const dx = seg.x - prev.x;
        const dy = seg.y - prev.y;
        const dz = seg.z - prev.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;

        if (d > this.spacing) {
          const k = this.spacing / d;
          seg.x = prev.x + dx * k;
          seg.y = prev.y + dy * k;
          seg.z = prev.z + dz * k;
        }

        prev = seg;
      }
    }
  }

  /**
   * Rotates the heading towards the unit vector `want` by at most `max` radians, in the plane
   * of the two (a plain blend would never turn round from a pearl straight behind).
   */
  private turn(wx: number, wy: number, wz: number, max: number): void {
    const d = this.dir;
    const dot = clamp(d.x * wx + d.y * wy + d.z * wz, -1, 1);
    const angle = Math.acos(dot);

    if (angle <= 1e-4) return;
    const turn = Math.min(angle, max);
    let px = wx - d.x * dot;
    let py = wy - d.y * dot;
    let pz = wz - d.z * dot;
    let pl = Math.hypot(px, py, pz);

    if (pl < 1e-6) {
      // Straight behind: swing round through up (or sideways when heading vertically).
      [px, py, pz] =
        Math.abs(d.y) < 0.9
          ? [-d.y * d.x, 1 - d.y * d.y, -d.y * d.z]
          : [1 - d.x * d.x, -d.x * d.y, -d.x * d.z];
      pl = Math.hypot(px, py, pz);
    }

    const c = Math.cos(turn);
    const sn = Math.sin(turn) / pl;
    const nx = d.x * c + px * sn;
    const ny = d.y * c + py * sn;
    const nz = d.z * c + pz * sn;
    const len = Math.hypot(nx, ny, nz) || 1;
    this.dir = { x: nx / len, y: ny / len, z: nz / len };
  }
}

const JADE: Rgb = [44, 176, 116];

const JADE_DARK: Rgb = [16, 86, 58];

const GOLD: Rgb = [255, 206, 84];

const GOLD_DARK: Rgb = [176, 110, 30];

const BELLY: Rgb = [240, 226, 160];

const EYE: Rgb = [255, 60, 40];

const WHITE: Rgb = [255, 255, 255];

/** Screen position of a 3D point, `view` subtracted (the camera for characters, 0 for tooltips). */
export function project(
  p: Point3,
  viewX: number,
  viewY: number,
): [number, number] {
  return [p.x - viewX, p.y + p.z * DEPTH_TILT - viewY];
}

/**
 * The dragon in pixels: segments with `z > 0` (in front) or not, tail to head so nearer
 * parts cover farther ones; a jade body tapering to the tail with gold scales every third
 * segment, gold fins along the spine, a head with horns and a red eye, whiskers trailing.
 * A shimmer runs down the scales from head to tail; `roaring`, the whole spine blazes.
 * `all` draws every segment on one pass, as round a tooltip where the dragon stays flat.
 */
export function drawDragon(
  b: Brush,
  dragon: Dragon,
  viewX: number,
  viewY: number,
  front: boolean,
  all = false,
  roaring = false,
): void {
  const segments = dragon.segments;
  const n = segments.length;
  // The shimmer's head travels two segments a tick, then rests a while before the next one.
  const shimmer = roaring ? -1 : (b.tick * 2) % (n * 3);

  for (let i = n - 1; i >= 1; i--) {
    const seg = segments[i];

    if (seg && (all || seg.z > 0 === front)) {
      const [x, y] = project(seg, viewX, viewY);
      drawSegment(b, Math.round(x), Math.round(y), i, n, shimmer);
    }
  }

  const head = dragon.head;

  if (all || head.z > 0 === front)
    drawHead(b, dragon, segments[5] ?? head, viewX, viewY);
}

/**
 * One body segment `i` of `n` at (x, y): tapering to the tail, gold scales every third,
 * a pale belly, gold fins on the spine. The shimmer lights the segments near its index;
 * a negative one is the roar, when the whole spine blazes.
 */
function drawSegment(
  b: Brush,
  x: number,
  y: number,
  i: number,
  n: number,
  shimmer: number,
): void {
  const a = b.intensity;
  const dim = b.dim();
  const r = Math.max(0, Math.round(3.2 * (1 - (i / n) * 0.85)));
  const scale = i % 3 === 0;
  dim.fillStyle = rgba(scale ? GOLD_DARK : JADE_DARK, a);
  pixelDisc(dim, x, y, r);
  dim.fillStyle = rgba(scale ? GOLD : JADE, a);

  if (r > 0) pixelDisc(dim, x, y - 1, r - 1);

  if (i % 2 === 0 && r > 1) plot(dim, x, y + r - 1, BELLY, a);

  if (i % 4 === 1 && i < n - 3) plot(dim, x, y - r - 1, GOLD, a);

  if (i === n - 1) plot(b.lit(), x, y, GOLD, a);

  if (shimmer < 0) plot(b.lit(), x, y - r, GOLD, 0.8 * a);
  else if (Math.abs(shimmer - i) < 2) plot(b.lit(), x, y - 1, WHITE, 0.9 * a);
}

/** The head facing its heading, whiskers trailing back to the segment `back`. */
function drawHead(
  b: Brush,
  dragon: Dragon,
  back: Point3,
  viewX: number,
  viewY: number,
): void {
  const a = b.intensity;
  const dim = b.dim();
  const [hx, hy] = project(dragon.head, viewX, viewY);
  const facing = dragon.heading.x >= 0 ? 1 : -1;
  const x = Math.round(hx);
  const y = Math.round(hy);
  const left = facing > 0 ? x - 2 : x - 3;
  // Head: a 6×4 snout-forward block, horns swept back, a glowing red eye.
  dim.fillStyle = rgba(JADE_DARK, a);
  dim.fillRect(left, y - 2, 6, 4);
  dim.fillStyle = rgba(JADE, a);
  dim.fillRect(left, y - 2, 6, 2);
  plot(dim, x + facing * 3, y, BELLY, a);
  plot(dim, x + facing * 3, y + 1, BELLY, a);
  pixelLine(dim, x - facing * 2, y - 2, x - facing * 5, y - 5, GOLD, a, a);
  pixelLine(dim, x - facing, y - 2, x - facing * 3, y - 5, GOLD_DARK, a, a);
  const lit = b.lit();
  plot(lit, x + facing, y - 1, EYE, a);
  // Whiskers trail back along the body's path, drooping a pixel.
  const [bx, by] = project(back, viewX, viewY);
  pixelLine(lit, x + facing * 3, y + 1, bx, by + 3, GOLD, 0.8 * a, 0.1 * a);
  pixelLine(lit, x + facing * 3, y, bx, by - 3, GOLD, 0.6 * a, 0.1 * a);
}

/** The pearl the dragon chases: a small glowing orb with a turning glint. */
export function drawPearl(b: Brush, x: number, y: number): void {
  const a = b.intensity;
  softEllipse(b.lit(), x, y, 6, 6, GOLD, 0.45 * a);
  const dim = b.dim();
  dim.fillStyle = rgba([255, 248, 226], a);
  pixelDisc(dim, Math.round(x), Math.round(y), 1);
  plot(b.lit(), x + ((b.tick >> 1) % 2 ? 1 : -1), y - 1, WHITE, a);
}

/** Lobes of one cloud puff: x offset and radius. */
const PUFF = [
  [-3, 2],
  [0, 3],
  [3, 2],
] as const;

/**
 * Auspicious clouds drifting under the feet: puffs of three solid lobes with a lit top and a
 * shaded underside, shrinking away at the ends of their drift instead of fading (a fade
 * would dither into a grey checkerboard).
 */
export function drawClouds(b: Brush, x: number, y: number, rx: number): void {
  const a = b.intensity;
  const dim = b.dim();
  const lit = b.lit();

  for (let i = 0; i < 4; i++) {
    const drift = ((b.time * 6 + i * 13) % (rx * 2.4)) - rx * 1.2;
    const size = 1 - Math.abs(drift) / (rx * 1.2);

    if (size < 0.25) continue;
    const cx = Math.round(x + drift);
    const cy = Math.round(y + (i % 2 ? 2 : -1));

    for (const [ox, r0] of PUFF) {
      const r = Math.max(1, Math.round(r0 * size));
      dim.fillStyle = rgba([150, 196, 186], a);
      pixelDisc(dim, cx + ox, cy + 1, r);
      dim.fillStyle = rgba([226, 246, 238], a);
      pixelDisc(dim, cx + ox, cy, r);
      plot(lit, cx + ox, cy - r, [255, 240, 190], 0.7 * a);
    }
  }
}
