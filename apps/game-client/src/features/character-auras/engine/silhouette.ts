import type { EdgeSite } from "./particles";
import { bandOf, distanceField } from "./pixel";

/**
 * The outline an aura hugs: a sprite frame's silhouette or a tooltip's box, pre-built
 * once so a frame only tints and blits it. Canvases are padded by `pad` on every side;
 * every coordinate below is relative to the unpadded silhouette's top-left.
 */
export interface AuraSilhouette {
  pad: number;
  width: number;
  height: number;
  /**
   * The silhouette's pixels as flat lists into the padded canvas, so a tick writes the tinted
   * outline straight into a buffer; null when the sprite's pixels can't be read (cross-origin),
   * and then `glow` stands in.
   */
  pixels: SilhouettePixels | null;
  glow: SilhouetteGlow | null;
  edge: EdgeSite[];
  bounds: { x: number; y: number; w: number; h: number };
  /** Where a halo sits: above the head for characters, the top right corner for boxes. */
  head: { x: number; y: number };
}

/** A cross-origin frame's crisp white silhouette and its blurred `near` and `far` glows. */
interface SilhouetteGlow {
  sil: HTMLCanvasElement;
  near: HTMLCanvasElement;
  far: HTMLCanvasElement;
}

/** Pixel indices (`y * width + x` in the padded canvas), each list with its parallel data. */
interface SilhouettePixels {
  /** Outline pixels and their band, inner to outer (`bandOf`). */
  outline: Uint32Array;
  band: Uint8Array;
  /** Pixels of the shape itself and their alpha. */
  body: Uint32Array;
  bodyAlpha: Uint8Array;
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

/** The tinted-pixel silhouette of a padded single-channel alpha buffer. */
function pixelSilhouette(
  alpha: Uint8Array,
  width: number,
  height: number,
  edge: EdgeSite[],
  bounds: AuraSilhouette["bounds"],
  head: AuraSilhouette["head"],
): AuraSilhouette {
  return {
    pad: PAD,
    width,
    height,
    pixels: silhouettePixels(alpha, width + PAD * 2, height + PAD * 2),
    glow: null,
    edge,
    bounds,
    head,
  };
}

/** The outline bands and the shape's own pixels, from the padded silhouette's alpha. */
function silhouettePixels(
  alpha: Uint8Array,
  width: number,
  height: number,
): SilhouettePixels {
  const size = width * height;
  const solid = new Uint8Array(size);
  let bodyCount = 0;

  for (let i = 0; i < size; i++) {
    const a = alpha[i] ?? 0;

    if (a > 96) solid[i] = 1;

    if (a > 0) bodyCount++;
  }

  const distance = distanceField(solid, width, height);
  const bands = new Int8Array(size);
  let outlineCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const band = bandOf(distance[i] ?? 0, x, y);
      bands[i] = band;

      if (band >= 0) outlineCount++;
    }
  }

  const pixels: SilhouettePixels = {
    outline: new Uint32Array(outlineCount),
    band: new Uint8Array(outlineCount),
    body: new Uint32Array(bodyCount),
    bodyAlpha: new Uint8Array(bodyCount),
  };

  for (let i = 0, o = 0, b = 0; i < size; i++) {
    const band = bands[i] ?? -1;

    if (band >= 0) {
      pixels.outline[o] = i;
      pixels.band[o++] = band;
    }

    const a = alpha[i] ?? 0;

    if (a > 0) {
      pixels.body[b] = i;
      pixels.bodyAlpha[b++] = a;
    }
  }

  return pixels;
}

/** The alpha channel of an RGBA buffer. */
function alphaOf(rgba: Uint8ClampedArray): Uint8Array {
  const alpha = new Uint8Array(rgba.length / 4);

  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] ?? 0;

  return alpha;
}

/** A sprite sheet's alpha, read once for all its frames. */
interface SheetAlpha {
  alpha: Uint8Array;
  width: number;
  height: number;
}

/** A sprite's size in pixels; 0 for sources the game never draws characters from. */
function sourceSize(image: CanvasImageSource) {
  if (image instanceof HTMLImageElement)
    return { width: image.naturalWidth, height: image.naturalHeight };

  if (image instanceof HTMLCanvasElement)
    return { width: image.width, height: image.height };

  return { width: 0, height: 0 };
}

/** Reads the whole sheet in one readback; null when it is cross-origin. */
function readSheet(
  image: CanvasImageSource,
  width: number,
  height: number,
): SheetAlpha | null {
  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas, { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  try {
    return {
      alpha: alphaOf(ctx.getImageData(0, 0, width, height).data),
      width,
      height,
    };
  } catch {
    // Cross-origin sprite: the canvas is tainted.
    return null;
  }
}

/** Silhouette of one sprite frame, cut from its sheet's alpha. */
function sheetSilhouette(
  sheet: SheetAlpha,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): AuraSilhouette {
  const width = sw + PAD * 2;
  const alpha = new Uint8Array(width * (sh + PAD * 2));
  const left = Math.round(sx);
  const top = Math.round(sy);

  for (let y = 0; y < sh; y++) {
    const row = top + y;

    if (row < 0 || row >= sheet.height) continue;

    for (let x = 0; x < sw; x++) {
      const column = left + x;

      if (column < 0 || column >= sheet.width) continue;
      alpha[(y + PAD) * width + x + PAD] =
        sheet.alpha[row * sheet.width + column] ?? 0;
    }
  }

  const outline = traceOutline(alpha, width, sw, sh);
  const bounds = outline?.bounds ?? fallbackBounds(sw, sh);
  const edge = outline?.edge.length ? outline.edge : ellipseSites(bounds);

  return pixelSilhouette(alpha, sw, sh, edge, bounds, {
    x: bounds.x + bounds.w / 2,
    y: bounds.y,
  });
}

function fallbackBounds(sw: number, sh: number): AuraSilhouette["bounds"] {
  return { x: sw * 0.25, y: sh * 0.22, w: sw * 0.5, h: sh * 0.78 };
}

/** A cross-origin sprite frame: blurred glows of its shape round an ellipse of sites. */
function glowSilhouette(
  image: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): AuraSilhouette {
  const sil = createCanvas(sw + PAD * 2, sh + PAD * 2);
  const ctx = context2d(sil);
  ctx.drawImage(image, sx, sy, sw, sh, PAD, PAD, sw, sh);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, sil.width, sil.height);

  const near = createCanvas(sil.width, sil.height);
  const nearCtx = context2d(near);
  drawBlurred(nearCtx, sil, 1.6, 3);
  drawBlurred(nearCtx, sil, 4, 1);
  const far = createCanvas(sil.width, sil.height);
  const farCtx = context2d(far);
  drawBlurred(farCtx, sil, 6, 2);
  drawBlurred(farCtx, sil, 11, 2);
  const bounds = fallbackBounds(sw, sh);

  return {
    pad: PAD,
    width: sw,
    height: sh,
    pixels: null,
    glow: { sil, near, far },
    edge: ellipseSites(bounds),
    bounds,
    head: { x: bounds.x + bounds.w / 2, y: bounds.y },
  };
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
  const alpha = alphaOf(ctx.getImageData(0, 0, sil.width, sil.height).data);
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

  return pixelSilhouette(
    alpha,
    width,
    height,
    edge,
    { x: 0, y: 0, w: width, h: height },
    { x: width - 10, y: 2 },
  );
}

/**
 * Outline pixels of a frame (alpha > 96 next to transparency) with gradient normals, from the
 * padded alpha buffer `stride` wide; coordinates are relative to the frame.
 */
function traceOutline(
  data: Uint8Array,
  stride: number,
  width: number,
  height: number,
): { edge: EdgeSite[]; bounds: AuraSilhouette["bounds"] } | null {
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height
      ? 0
      : (data[(y + PAD) * stride + x + PAD] ?? 0);

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
  const every = Math.max(1, sites.length / MAX_EDGE_SITES);
  const edge: EdgeSite[] = [];

  for (let i = 0; i < sites.length; i += every) {
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
 * Time a frame may spend building silhouettes, ms. A crowd entering the map or every walker
 * stepping onto a new frame at once would otherwise stall that frame; the rest wait for the
 * next ones, keeping their last silhouette meanwhile.
 */
const BUILD_BUDGET_MS = 1;

/**
 * Silhouettes per sprite frame. Walking cycles through 16 frames of one image; animated outfits
 * multiply that, so each image keeps at most `perImage` silhouettes and starts over past it.
 * Each sheet's pixels are read once and every frame is cut from them.
 */
export class SilhouetteCache {
  private byImage = new WeakMap<object, Map<string, AuraSilhouette>>();
  private sheets = new WeakMap<object, SheetAlpha | null>();
  private spent = 0;

  constructor(
    private readonly perImage = 128,
    private readonly budget = BUILD_BUDGET_MS,
  ) {}

  /** Starts a frame's build budget; the first build of a frame always runs. */
  beginFrame(): void {
    this.spent = 0;
  }

  /** The frame's silhouette, or null when it is not built yet and this frame's budget is spent. */
  sprite(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): AuraSilhouette | null {
    let frames = this.byImage.get(image);

    if (!frames) {
      frames = new Map();
      this.byImage.set(image, frames);
    }

    const key = `${sx},${sy},${sw},${sh}`;
    const cached = frames.get(key);

    if (cached) return cached;

    const { width, height } = sourceSize(image);

    // A sprite still loading has nothing to outline yet.
    if (!(width > 0 && height > 0) || this.spent >= this.budget) return null;
    const start = performance.now();

    try {
      let sheet = this.sheets.get(image);

      if (sheet === undefined) {
        sheet = readSheet(image, width, height);
        this.sheets.set(image, sheet);
      }

      const silhouette = sheet
        ? sheetSilhouette(sheet, sx, sy, sw, sh)
        : glowSilhouette(image, sx, sy, sw, sh);

      if (frames.size >= this.perImage) frames.clear();
      frames.set(key, silhouette);

      return silhouette;
    } finally {
      this.spent += performance.now() - start;
    }
  }

  /** Drops every silhouette, for when no aura is drawn. */
  clear(): void {
    this.byImage = new WeakMap();
    this.sheets = new WeakMap();
  }
}
