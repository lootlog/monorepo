import type { EdgeSite } from "./particles";
import { BAND_COUNT, bandOf, distanceField } from "./pixel";

/**
 * The outline an aura hugs: a sprite frame's silhouette or a tooltip's box, pre-built
 * once so a frame only tints and blits it. Canvases are padded by `pad` on every side;
 * every coordinate below is relative to the unpadded silhouette's top-left.
 */
export interface AuraSilhouette {
  pad: number;
  width: number;
  height: number;
  /** White silhouette, crisp. */
  sil: HTMLCanvasElement;
  /**
   * White pixel-art outline bands, inner to outer (`bandOf`); null when the sprite's pixels
   * can't be read (cross-origin), and then the blurred `near`/`far` glows stand in.
   */
  bands: HTMLCanvasElement[] | null;
  near: HTMLCanvasElement | null;
  far: HTMLCanvasElement | null;
  edge: EdgeSite[];
  bounds: { x: number; y: number; w: number; h: number };
  /** Where a halo sits: above the head for characters, the top right corner for boxes. */
  head: { x: number; y: number };
}

/** Room for the widest glow (~3σ of the fallback blur) so it never clips at the canvas edge. */
const PAD = 38;

const MAX_EDGE_SITES = 90;

let filterSupport: boolean | null = null;

/** `ctx.filter` blur is fast and exact; Safari before 18 lacks it, so shadows stand in. */
function supportsFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  const ctx = document.createElement("canvas").getContext("2d");

  if (ctx && "filter" in ctx) {
    ctx.filter = "blur(2px)";
    filterSupport = ctx.filter === "blur(2px)";
  } else {
    filterSupport = false;
  }

  return filterSupport;
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));

  return canvas;
}

/** The 2D context of an aura canvas; every browser the game runs in provides one. */
export function context2d(
  canvas: HTMLCanvasElement,
  settings?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", settings);

  if (!ctx) throw new Error("Canvas 2D context is unavailable.");

  return ctx;
}

/** Draws `src` blurred by `radius` px into `ctx`, `passes` times to thicken the glow. */
function drawBlurred(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  radius: number,
  passes: number,
): void {
  ctx.save();

  if (supportsFilter()) {
    ctx.filter = `blur(${radius}px)`;

    for (let i = 0; i < passes; i++) ctx.drawImage(src, 0, 0);
  } else {
    // The shadow of an image drawn off canvas lands back on it, blurred.
    const away = src.width + 64;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = radius * 2;
    ctx.shadowOffsetX = away;

    for (let i = 0; i < passes; i++) ctx.drawImage(src, -away, 0);
  }

  ctx.restore();
}

function finishSilhouette(
  sil: HTMLCanvasElement,
  alpha: Uint8ClampedArray | null,
  width: number,
  height: number,
  edge: EdgeSite[],
  bounds: AuraSilhouette["bounds"],
  head: AuraSilhouette["head"],
): AuraSilhouette {
  const bands = alpha ? buildBands(alpha, sil.width, sil.height) : null;

  if (bands)
    return {
      pad: PAD,
      width,
      height,
      sil,
      bands,
      near: null,
      far: null,
      edge,
      bounds,
      head,
    };
  const near = createCanvas(sil.width, sil.height);
  const nearCtx = context2d(near);
  drawBlurred(nearCtx, sil, 1.6, 3);
  drawBlurred(nearCtx, sil, 4, 1);
  const far = createCanvas(sil.width, sil.height);
  const farCtx = context2d(far);
  drawBlurred(farCtx, sil, 6, 2);
  drawBlurred(farCtx, sil, 11, 2);

  return {
    pad: PAD,
    width,
    height,
    sil,
    bands: null,
    near,
    far,
    edge,
    bounds,
    head,
  };
}

/** One white mask per outline band, from the silhouette's alpha. */
function buildBands(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement[] {
  const solid = new Uint8Array(width * height);

  for (let i = 0; i < solid.length; i++)
    solid[i] = (alpha[i * 4 + 3] ?? 0) > 96 ? 1 : 0;
  const distance = distanceField(solid, width, height);

  const images = Array.from(
    { length: BAND_COUNT },
    () => new ImageData(width, height),
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const band = bandOf(distance[i] ?? 0, x, y);

      if (band < 0) continue;
      images[band]?.data.set([255, 255, 255, 255], i * 4);
    }
  }

  return images.map((image) => {
    const canvas = createCanvas(width, height);
    context2d(canvas).putImageData(image, 0, 0);

    return canvas;
  });
}

/** Silhouette of one sprite frame. Reads pixels for the outline when the image allows it. */
export function buildSpriteSilhouette(
  image: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): AuraSilhouette {
  const sil = createCanvas(sw + PAD * 2, sh + PAD * 2);
  const ctx = context2d(sil, { willReadFrequently: true });
  ctx.drawImage(image, sx, sy, sw, sh, PAD, PAD, sw, sh);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, sil.width, sil.height);

  let outline: ReturnType<typeof traceOutline> = null;
  let alpha: Uint8ClampedArray | null = null;

  try {
    alpha = ctx.getImageData(0, 0, sil.width, sil.height).data;
    outline = traceOutline(ctx.getImageData(PAD, PAD, sw, sh).data, sw, sh);
  } catch {
    // Cross-origin sprite: the canvas is tainted; blurred glows and an ellipse stand in.
  }

  const fallback = { x: sw * 0.25, y: sh * 0.22, w: sw * 0.5, h: sh * 0.78 };
  const bounds = outline?.bounds ?? fallback;
  const edge = outline?.edge.length ? outline.edge : ellipseSites(bounds);

  return finishSilhouette(sil, alpha, sw, sh, edge, bounds, {
    x: bounds.x + bounds.w / 2,
    y: bounds.y,
  });
}

/** A rounded box, for tooltips. */
export function buildBoxSilhouette(
  width: number,
  height: number,
  radius = 1,
): AuraSilhouette {
  const sil = createCanvas(width + PAD * 2, height + PAD * 2);
  const ctx = context2d(sil, { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(PAD, PAD, width, height, radius);
  ctx.fill();
  const alpha = ctx.getImageData(0, 0, sil.width, sil.height).data;
  const edge: EdgeSite[] = [];
  const perimeter = 2 * (width + height);
  const step = Math.max(6, perimeter / MAX_EDGE_SITES);

  for (let d = 0; d < perimeter; d += step) {
    if (d < width) edge.push({ x: d, y: 0, nx: 0, ny: -1 });
    else if (d < width + height)
      edge.push({ x: width, y: d - width, nx: 1, ny: 0 });
    else if (d < 2 * width + height)
      edge.push({ x: 2 * width + height - d, y: height, nx: 0, ny: 1 });
    else edge.push({ x: 0, y: perimeter - d, nx: -1, ny: 0 });
  }

  return finishSilhouette(
    sil,
    alpha,
    width,
    height,
    edge,
    { x: 0, y: 0, w: width, h: height },
    { x: width - 10, y: 2 },
  );
}

/** Outline pixels of an RGBA buffer (alpha > 96 next to transparency) with gradient normals. */
export function traceOutline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { edge: EdgeSite[]; bounds: AuraSilhouette["bounds"] } | null {
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height
      ? 0
      : (data[(y * width + x) * 4 + 3] ?? 0);

  const solid = (x: number, y: number) => alpha(x, y) > 96;
  const sites: EdgeSite[] = [];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!solid(x, y)) continue;

      if (x < minX) minX = x;

      if (x > maxX) maxX = x;

      if (y < minY) minY = y;

      if (y > maxY) maxY = y;

      if (
        solid(x - 1, y) &&
        solid(x + 1, y) &&
        solid(x, y - 1) &&
        solid(x, y + 1)
      )
        continue;
      let nx = alpha(x - 2, y) - alpha(x + 2, y);
      let ny = alpha(x, y - 2) - alpha(x, y + 2);
      const len = Math.hypot(nx, ny);

      if (len > 0) {
        nx /= len;
        ny /= len;
      } else {
        ny = -1;
      }

      sites.push({ x: x + 0.5, y: y + 0.5, nx, ny });
    }
  }

  if (maxX < 0) return null;
  const stride = Math.max(1, sites.length / MAX_EDGE_SITES);
  const edge: EdgeSite[] = [];

  for (let i = 0; i < sites.length; i += stride) {
    const site = sites[Math.floor(i)];

    if (site) edge.push(site);
  }

  return {
    edge,
    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  };
}

function ellipseSites(bounds: AuraSilhouette["bounds"]): EdgeSite[] {
  const sites: EdgeSite[] = [];
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;

  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    sites.push({
      x: cx + (nx * bounds.w) / 2,
      y: cy + (ny * bounds.h) / 2,
      nx,
      ny,
    });
  }

  return sites;
}

/**
 * Silhouettes per sprite frame. Walking cycles through 16 frames of one image; animated outfits
 * multiply that, so each image keeps at most `perImage` silhouettes and starts over past it.
 */
export class SilhouetteCache {
  private readonly byImage = new WeakMap<object, Map<string, AuraSilhouette>>();

  constructor(private readonly perImage = 128) {}

  sprite(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): AuraSilhouette {
    let frames = this.byImage.get(image);

    if (!frames) {
      frames = new Map();
      this.byImage.set(image, frames);
    }

    const key = `${sx},${sy},${sw},${sh}`;
    let silhouette = frames.get(key);

    if (!silhouette) {
      if (frames.size >= this.perImage) frames.clear();
      silhouette = buildSpriteSilhouette(image, sx, sy, sw, sh);
      frames.set(key, silhouette);
    }

    return silhouette;
  }
}
