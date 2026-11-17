import { clamp } from "es-toolkit";
import type { Rgb } from "./math";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

/** A tinted mask composited once per tick and silhouette, then only copied each frame. */
interface Composite {
  silhouette: AuraSilhouette | null;
  key: string;
  canvas: HTMLCanvasElement;
  /** The pixel buffer written into `canvas`, reused while its size holds. */
  image: ImageData | null;
}

export function createComposite(): Composite {
  return { silhouette: null, key: "", canvas: createCanvas(1, 1), image: null };
}

/** Rebuilds `composite` for `key` and the silhouette when stale, via `paint` on a cleared canvas. */
export function compositeCanvas(
  composite: Composite,
  silhouette: AuraSilhouette,
  key: string,
  paint: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  if (composite.silhouette === silhouette && composite.key === key)
    return composite.canvas;
  composite.silhouette = silhouette;
  composite.key = key;
  const { canvas } = composite;
  const width = silhouette.width + silhouette.pad * 2;
  const height = silhouette.height + silhouette.pad * 2;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const octx = context2d(canvas);
  octx.globalCompositeOperation = "source-over";
  octx.globalAlpha = 1;
  octx.clearRect(0, 0, canvas.width, canvas.height);
  paint(octx);
  octx.globalAlpha = 1;
  octx.globalCompositeOperation = "source-over";

  return canvas;
}

/** Writes `fill`'s pixels into a cleared composite through its reused buffer. */
export function paintPixels(
  octx: CanvasRenderingContext2D,
  composite: Composite,
  fill: (data: Uint8ClampedArray, width: number, height: number) => void,
): void {
  const { width, height } = composite.canvas;
  let image = composite.image;

  if (image?.width === width && image.height === height) image.data.fill(0);
  else image = composite.image = new ImageData(width, height);
  fill(image.data, width, height);
  octx.putImageData(image, 0, 0);
}

export function blitComposite(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  canvas: HTMLCanvasElement,
): void {
  const pad = place.silhouette.pad;
  ctx.globalAlpha = 1;
  ctx.drawImage(canvas, Math.round(place.x) - pad, Math.round(place.y) - pad);
}

export const WHITE: Rgb = [255, 255, 255];

/** The prism gradient runs from the top-left corner to this fraction of the width at the bottom. */
export const RAINBOW_RUN = 0.3;

/**
 * The colour at pixel `i` of a `width`×`height` buffer: the only colour, or the rainbow
 * gradient through evenly spaced `stops` sampled at the pixel centre, as `rainbow` paints it.
 */
export function colorAt(
  stops: readonly Rgb[],
  i: number,
  width: number,
  height: number,
): Rgb {
  const first = stops[0] ?? WHITE;

  if (stops.length < 2) return first;
  const gx = width * RAINBOW_RUN;
  const x = (i % width) + 0.5;
  const y = Math.floor(i / width) + 0.5;
  const t = clamp((x * gx + y * height) / (gx * gx + height * height), 0, 1);
  const position = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const from = stops[index] ?? first;
  const to = stops[index + 1] ?? from;
  const k = position - index;

  return [
    from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k,
    from[2] + (to[2] - from[2]) * k,
  ];
}

/** Sets pixel `i` to `color` at `alpha`; the clamped buffer rounds the channels. */
export function writePixel(
  data: Uint8ClampedArray,
  i: number,
  color: Rgb,
  alpha: number,
): void {
  const o = i * 4;
  data[o] = color[0];
  data[o + 1] = color[1];
  data[o + 2] = color[2];
  data[o + 3] = alpha * 255;
}

let scratch: HTMLCanvasElement | null = null;

/** `mask` filled with `fill` through its alpha, on a shared scratch canvas valid until the next call. */
export function tint(
  mask: HTMLCanvasElement,
  fill: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => string | CanvasGradient,
): HTMLCanvasElement {
  if (!scratch || scratch.width < mask.width || scratch.height < mask.height) {
    scratch = createCanvas(
      Math.max(mask.width, scratch?.width ?? 0),
      Math.max(mask.height, scratch?.height ?? 0),
    );
  }

  const ctx = context2d(scratch);
  ctx.globalCompositeOperation = "copy";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = fill(ctx, mask.width, mask.height);
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.globalCompositeOperation = "source-over";

  return scratch;
}
