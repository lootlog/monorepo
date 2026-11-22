import type { EdgeSite } from "./particles";
import { bandOf, distanceField } from "./pixel";

export interface AuraSilhouette {
  pad: number;
  width: number;
  height: number;
  pixels: SilhouettePixels | null;
  glow: SilhouetteGlow | null;
  edge: EdgeSite[];
  bounds: { x: number; y: number; w: number; h: number };
  head: { x: number; y: number };
}

interface SilhouetteGlow {
  sil: HTMLCanvasElement;
  near: HTMLCanvasElement;
  far: HTMLCanvasElement;
}

interface SilhouettePixels {
  outline: Uint32Array;
  band: Uint8Array;
  body: Uint32Array;
  bodyAlpha: Uint8Array;
}

const PAD = 38;

const MAX_EDGE_SITES = 90;

let filterSupport: boolean | null = null;

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

export function context2d(
  canvas: HTMLCanvasElement,
  settings?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", settings);

  if (!ctx) throw new Error("Canvas 2D context is unavailable.");

  return ctx;
}

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
    const away = src.width + 64;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = radius * 2;
    ctx.shadowOffsetX = away;

    for (let i = 0; i < passes; i++) ctx.drawImage(src, -away, 0);
  }

  ctx.restore();
}

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

function alphaOf(rgba: Uint8ClampedArray): Uint8Array {
  const alpha = new Uint8Array(rgba.length / 4);

  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] ?? 0;

  return alpha;
}

interface SheetAlpha {
  alpha: Uint8Array;
  width: number;
  height: number;
}

function sourceSize(image: CanvasImageSource) {
  if (image instanceof HTMLImageElement)
    return { width: image.naturalWidth, height: image.naturalHeight };

  if (image instanceof HTMLCanvasElement)
    return { width: image.width, height: image.height };

  return { width: 0, height: 0 };
}

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
    return null;
  }
}

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

const BUILD_BUDGET_MS = 1;

export class SilhouetteCache {
  private byImage = new WeakMap<object, Map<string, AuraSilhouette>>();
  private sheets = new WeakMap<object, SheetAlpha | null>();
  private spent = 0;

  constructor(
    private readonly perImage = 128,
    private readonly budget = BUILD_BUDGET_MS,
  ) {}

  beginFrame(): void {
    this.spent = 0;
  }

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

  clear(): void {
    this.byImage = new WeakMap();
    this.sheets = new WeakMap();
  }
}
