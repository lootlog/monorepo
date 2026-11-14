/**
 * What an aura's effect over the whole map draws from, and the helpers those effects
 * share. They run every frame over the whole screen, so each one is a few fills, sprite
 * blits and small rects: nothing here reads pixels back or allocates per frame.
 */
import { rgba, type Rgb } from "./math";
import { context2d, createCanvas } from "./silhouette";

/** One frame of an effect over the whole map, in the context's units (screen px). */
export interface MapScene {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** The aura's stepped clock, s: what its pieces round the character animate by. */
  time: number;
  /** Seconds since the aura showed, every frame: what moves smoothly over the map. */
  now: number;
  /** The camera, so things stay on the map as it scrolls. */
  view: readonly [number, number];
  /** The character's chest and feet on screen. */
  x: number;
  y: number;
  feetY: number;
  /** The top of the character on screen, and half its width. */
  top: number;
  half: number;
  /** The aura's burst, 0..1 between ticks too; -1 while it rests. */
  burst: number;
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
}

export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/** A 32-bit hash of a cell of a scattered field. */
function hashCell(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 40503);

  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Calls `each` for every point of an endless field (one point a `cell`, placed by its
 * hash) inside the `width`×`height` window whose top-left is at (`left`, `top`) in the
 * field: its position in the window and two numbers in 0..1 that are the point's own.
 */
export function scatter(
  left: number,
  top: number,
  width: number,
  height: number,
  cell: number,
  seed: number,
  each: (x: number, y: number, a: number, b: number) => void,
): void {
  const x0 = Math.floor(left / cell);
  const y0 = Math.floor(top / cell);
  const x1 = Math.floor((left + width) / cell);
  const y1 = Math.floor((top + height) / cell);

  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const h = hashCell(cx, cy, seed);
      const k = hashCell(cy, cx, seed + 17);
      each(
        (cx + (h & 0xffff) / 65536) * cell - left,
        (cy + (h >>> 16) / 65536) * cell - top,
        (k & 0xffff) / 65536,
        (k >>> 16) / 65536,
      );
    }
  }
}

/** A flat wash over the whole screen. */
export function wash(
  { ctx, width, height }: MapScene,
  color: Rgb,
  alpha: number,
  mode: GlobalCompositeOperation = "source-over",
): void {
  if (alpha <= 0.01) return;
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = rgba(color, 1);
  ctx.fillRect(0, 0, width, height);
}

const clearings = new Map<string, HTMLCanvasElement>();

/** A square of `color` thinning out towards its centre: clear within `inner` px, full at `outer`. */
function clearing(color: Rgb, inner: number, outer: number): HTMLCanvasElement {
  const key = `${color.join(",")}|${inner}|${outer}`;
  const cached = clearings.get(key);

  if (cached) return cached;
  const canvas = createCanvas(outer * 2, outer * 2);
  const ctx = context2d(canvas);

  const gradient = ctx.createRadialGradient(
    outer,
    outer,
    inner,
    outer,
    outer,
    outer,
  );

  gradient.addColorStop(0, rgba(color, 0.12));
  gradient.addColorStop(1, rgba(color, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, outer * 2, outer * 2);
  clearings.set(key, canvas);

  return canvas;
}

/**
 * A wash over the whole screen that thins out towards the character, so a dark sky
 * leaves the aura that brought it its light: clear within `inner` px, full beyond `outer`.
 * The thinning is one sprite built once and the rest four flat fills: a gradient over
 * the whole screen costs ten times a flat fill when the CPU draws it.
 */
export function washAround(
  { ctx, width, height, x, y }: MapScene,
  color: Rgb,
  alpha: number,
  inner: number,
  outer: number,
  mode: GlobalCompositeOperation = "source-over",
): void {
  if (alpha <= 0.01) return;
  const left = Math.round(x) - outer;
  const top = Math.round(y) - outer;
  const size = outer * 2;
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = rgba(color, 1);
  ctx.fillRect(0, 0, width, top);
  ctx.fillRect(0, top + size, width, height - top - size);
  ctx.fillRect(0, top, left, size);
  ctx.fillRect(left + size, top, width - left - size, size);
  ctx.drawImage(clearing(color, inner, outer), left, top);
}
