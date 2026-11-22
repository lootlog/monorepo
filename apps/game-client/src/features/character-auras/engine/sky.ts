import { rgba, type Rgb } from "./math";
import { context2d, createCanvas } from "./silhouette";

export interface MapScene {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  now: number;
  view: readonly [number, number];
  x: number;
  y: number;
  feetY: number;
  top: number;
  half: number;
  burst: number;
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
}

export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function hashCell(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 40503);

  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return (h ^ (h >>> 16)) >>> 0;
}

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
