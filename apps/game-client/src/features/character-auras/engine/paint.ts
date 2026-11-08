/** Pixel-art drawing primitives shared by the aura renderer and its decorations. */
import { clamp } from "es-toolkit";
import { hslToRgb, rgba, TAU, type Rgb, type Rng } from "./math";
import { context2d, createCanvas } from "./silhouette";

export const ORTHO = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export const DIAG = [
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
] as const;

/** Leaf pixels [dx, dy, dark] in three flutter poses. */
export const LEAF_POSES: readonly (readonly (readonly [
  number,
  number,
  number,
])[])[] = [
  [
    [-1, 0, 0],
    [0, 0, 0],
    [1, 0, 1],
    [0, -1, 0],
  ],
  [
    [-1, -1, 0],
    [0, 0, 0],
    [1, 1, 1],
    [0, -1, 0],
  ],
  [
    [-1, 1, 0],
    [0, 0, 0],
    [1, -1, 1],
    [1, 0, 0],
  ],
];

/**
 * The single pixels plotted into an additive (`lighter`) layer, kept as premultiplied RGBA
 * instead of one `fillRect` and parsed colour string each: a tick plots hundreds of them,
 * and `lighter` adds and clamps in any order, so they can join the layer at its finish.
 */
export class LightPixels {
  private data = new Uint8ClampedArray(0);
  private ox = 0;
  private oy = 0;
  private width = 0;
  private height = 0;
  /** The plotted area in buffer pixels; empty while `left > right`. */
  private left = 0;
  private top = 0;
  private right = -1;
  private bottom = -1;

  /** Starts over for a `width`×`height` layer whose top-left is (`ox`, `oy`) when drawing. */
  reset(ox: number, oy: number, width: number, height: number): void {
    this.clear();
    this.ox = ox;
    this.oy = oy;
    this.width = width;
    this.height = height;

    if (this.data.length < width * height * 4)
      this.data = new Uint8ClampedArray(width * height * 4);
  }

  add(x: number, y: number, color: Rgb, alpha: number): void {
    const px = Math.round(x) - this.ox;
    const py = Math.round(y) - this.oy;

    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    // The precision `rgba` hands the canvas.
    const a = Math.round(Math.min(alpha, 1) * 1000) / 1000;
    const { data } = this;
    const i = (py * this.width + px) * 4;
    // Clamped bytes saturate like `lighter` does.
    data[i] = (data[i] ?? 0) + color[0] * a;
    data[i + 1] = (data[i + 1] ?? 0) + color[1] * a;
    data[i + 2] = (data[i + 2] ?? 0) + color[2] * a;
    data[i + 3] = (data[i + 3] ?? 0) + 255 * a;

    if (this.empty) {
      this.left = this.right = px;
      this.top = this.bottom = py;

      return;
    }

    this.left = Math.min(this.left, px);
    this.right = Math.max(this.right, px);
    this.top = Math.min(this.top, py);
    this.bottom = Math.max(this.bottom, py);
  }

  get empty(): boolean {
    return this.left > this.right;
  }

  /** Adds the plots into `target`, the layer's straight-alpha pixels, and starts over. */
  addInto(target: Uint8ClampedArray): void {
    const { data, width } = this;

    for (let y = this.top; y <= this.bottom; y++) {
      for (let x = this.left; x <= this.right; x++) {
        const i = (y * width + x) * 4;
        const sa = data[i + 3] ?? 0;

        if (sa === 0) continue;
        const da = target[i + 3] ?? 0;
        const alpha = Math.min(255, sa + da);

        for (let c = 0; c < 3; c++) {
          const premultiplied = Math.min(
            255,
            (data[i + c] ?? 0) + ((target[i + c] ?? 0) * da) / 255,
          );

          target[i + c] = (premultiplied * 255) / alpha;
        }

        target[i + 3] = alpha;
      }
    }

    this.clear();
  }

  private clear(): void {
    if (this.empty) return;

    for (let y = this.top; y <= this.bottom; y++)
      this.data.fill(
        0,
        (y * this.width + this.left) * 4,
        (y * this.width + this.right + 1) * 4,
      );
    this.left = this.top = 0;
    this.right = this.bottom = -1;
  }
}

const lightPixels = new WeakMap<CanvasRenderingContext2D, LightPixels>();

/** Sends `ctx`'s plots to `pixels` until unbound with null; `ctx` must be drawing with `lighter`. */
export function bindLightPixels(
  ctx: CanvasRenderingContext2D,
  pixels: LightPixels | null,
): void {
  if (pixels) lightPixels.set(ctx, pixels);
  else lightPixels.delete(ctx);
}

export function plot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: Rgb,
  alpha: number,
): void {
  if (alpha <= 0.02) return;
  const light = lightPixels.get(ctx);

  if (light) {
    light.add(x, y, color, alpha);

    return;
  }

  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function hot(color: Rgb): Rgb {
  return [
    Math.round(color[0] + (255 - color[0]) * 0.65),
    Math.round(color[1] + (255 - color[1]) * 0.65),
    Math.round(color[2] + (255 - color[2]) * 0.65),
  ];
}

/** A bright centre pixel with four arms, plus dim diagonals when `full`. */
export function pixelPlus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  core: Rgb,
  color: Rgb,
  alpha: number,
  full: boolean,
): void {
  plot(ctx, x, y, core, alpha);

  for (const [dx, dy] of ORTHO) plot(ctx, x + dx, y + dy, color, alpha * 0.7);

  if (full)
    for (const [dx, dy] of DIAG) plot(ctx, x + dx, y + dy, color, alpha * 0.3);
}

/** A pixel cross sparkle with arms of `arm` pixels fading outwards. */
export function pixelGlint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  arm: number,
  core: Rgb,
  color: Rgb,
  alpha: number,
): void {
  if (arm < 0 || alpha <= 0.02) return;
  plot(ctx, x, y, core, alpha);

  for (let i = 1; i <= arm; i++) {
    const a = alpha * (1 - (i - 1) / (arm + 1));

    for (const [dx, dy] of ORTHO)
      plot(ctx, x + dx * i, y + dy * i, i === 1 ? core : color, a);
  }

  if (arm >= 2)
    for (const [dx, dy] of DIAG) plot(ctx, x + dx, y + dy, color, alpha * 0.45);
}

/** One pixel per step from (x0, y0) to (x1, y1), alpha fading from `a0` to `a1`. */
export function pixelLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgb,
  a0: number,
  a1: number,
): void {
  const steps = Math.max(
    1,
    Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))),
  );

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    plot(
      ctx,
      x0 + (x1 - x0) * t,
      y0 + (y1 - y0) * t,
      color,
      a0 + (a1 - a0) * t,
    );
  }
}

/** An ellipse outline of single pixels; `color` null paints a rolling rainbow starting at `hue`. */
export function pixelEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Rgb | null,
  alpha: number,
  hue: number,
  step: number,
): void {
  if (alpha <= 0.02 || rx < 1) return;
  const count = Math.max(8, Math.round((TAU * Math.max(rx, ry)) / step));

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * TAU;
    plot(
      ctx,
      cx + Math.cos(ang) * rx,
      cy + Math.sin(ang) * ry,
      color ?? hslToRgb(((ang + hue) / TAU) * 360, 1, 0.62),
      alpha,
    );
  }
}

/** The front (lower, `front`) or back (upper) half of a pixel ellipse, for rings around a character. */
export function pixelArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Rgb,
  alpha: number,
  front: boolean,
): void {
  if (alpha <= 0.02 || rx < 1) return;
  const count = Math.max(8, Math.round(TAU * Math.max(rx, ry)));

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * TAU;

    if (Math.sin(ang) >= 0 !== front) continue;
    plot(ctx, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, color, alpha);
  }
}

/** A filled pixel circle in the current fill style. */
export function pixelDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

const dotTextures = new Map<string, HTMLCanvasElement>();

const DOT_SIZE = 64;

/** A soft round light of `diameter` px, dithered into pixels by the layer finish. */
export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  diameter: number,
  color: Rgb,
  alpha: number,
): void {
  if (alpha <= 0.01 || diameter <= 0.2) return;
  const key = color.join(",");
  let texture = dotTextures.get(key);

  if (!texture) {
    texture = createCanvas(DOT_SIZE, DOT_SIZE);
    // Kept in memory like the aura layers it is drawn into: a GPU texture would be read
    // back on every draw, over ten times slower.
    const tctx = context2d(texture, { willReadFrequently: true });
    const half = DOT_SIZE / 2;
    const gradient = tctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, rgba(hot(color), 1));
    gradient.addColorStop(0.25, rgba(color, 0.85));
    gradient.addColorStop(0.6, rgba(color, 0.3));
    gradient.addColorStop(1, rgba(color, 0));
    tctx.fillStyle = gradient;
    tctx.fillRect(0, 0, DOT_SIZE, DOT_SIZE);
    dotTextures.set(key, texture);
  }

  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * clamp(alpha, 0, 1);
  ctx.drawImage(
    texture,
    x - diameter / 2,
    y - diameter / 2,
    diameter,
    diameter,
  );
  ctx.globalAlpha = previous;
}

export function softEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: Rgb,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.55, rgba(color, alpha * 0.45));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Glyphs for the divine circle: pixel offsets in a 3×3 box, drawn upright on the ellipse. */
export const RUNES: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, -1],
    [0, 0],
    [0, 1],
    [-1, -1],
    [1, -1],
  ],
  [
    [-1, -1],
    [0, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
  ],
  [
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 0],
  ],
  [
    [-1, 1],
    [0, 0],
    [1, 1],
    [0, -1],
  ],
  [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 0],
    [1, -1],
  ],
  [
    [0, -1],
    [0, 0],
    [0, 1],
    [-1, 1],
    [1, 1],
  ],
];

export function drawRunes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  turn: number,
  color: Rgb,
  alpha: number,
): void {
  const count = 8;

  for (let i = 0; i < count; i++) {
    const angle = turn + (i / count) * TAU;
    const x = Math.round(cx + Math.cos(angle) * rx);
    const y = Math.round(cy + Math.sin(angle) * ry);
    const glyph = RUNES[i % RUNES.length] ?? [];
    // A run of three runes lit at a time, walking round the circle.
    const lit = (Math.floor(turn * 10) + i) % count < 3;

    for (const [dx, dy] of glyph)
      plot(ctx, x + dx, y + dy, color, alpha * (lit ? 1 : 0.5));
  }
}

/** Midpoint-displaced polyline from a to b, as flat [x, y, …]. */
export function jagged(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rng: Rng,
): number[] {
  let points = [ax, ay, bx, by];
  let spread = Math.hypot(bx - ax, by - ay) * 0.28;

  for (let depth = 0; depth < 4; depth++) {
    const next: number[] = [];

    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i] ?? 0;
      const y1 = points[i + 1] ?? 0;
      const x2 = points[i + 2] ?? 0;
      const y2 = points[i + 3] ?? 0;
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const offset = (rng() - 0.5) * spread;
      next.push(
        x1,
        y1,
        (x1 + x2) / 2 + (-(y2 - y1) / len) * offset,
        (y1 + y2) / 2 + ((x2 - x1) / len) * offset,
      );
    }

    // The far end never moves.
    next.push(bx, by);
    points = next;
    spread *= 0.55;
  }

  return points;
}
