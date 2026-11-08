/**
 * Pixel-art finish for the aura layers: alpha snapped to a few hard levels with an ordered
 * (Bayer 4×4) dither, the way hand-drawn sprites shade glows, instead of smooth gradients.
 */

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Quantized values by `(bayer << 8) | value`, per level count. */
const quantizeTables = new Map<number, Uint8Array>();

/** Each byte snapped to `levels` steps at every Bayer threshold, so a pixel is a lookup. */
function quantizeTable(levels: number): Uint8Array {
  let table = quantizeTables.get(levels);

  if (table) return table;
  const steps = levels - 1;
  table = new Uint8Array(16 << 8);

  for (let b = 0; b < 16; b++) {
    const threshold = (b + 0.5) / 16;

    for (let v = 0; v < 256; v++)
      table[(b << 8) | v] = Math.round(
        (Math.min(steps, Math.floor((v / 255) * steps + threshold)) / steps) *
          255,
      );
  }

  quantizeTables.set(levels, table);

  return table;
}

function quantizeColor(
  data: Uint8ClampedArray,
  i: number,
  table: Uint8Array,
  bayer: number,
): void {
  for (let c = i; c < i + 3; c++) data[c] = table[bayer | (data[c] ?? 0)] ?? 0;
}

/**
 * Quantizes the alpha of an RGBA buffer in place to `levels` steps (0 included). Pixels
 * under `floor` are cleared, so faint smears don't turn into stray dither dots. `originX`/
 * `originY` anchor the dither pattern to screen pixels, so it doesn't crawl as a buffer moves.
 * With `colorLevels`, each colour channel is quantized the same way. Returns what is left
 * visible, as `alphaBounds` does.
 */
export function posterizeAlpha(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number,
  floor = 0.06,
  originX = 0,
  originY = 0,
  colorLevels = 0,
): PixelBounds | null {
  const alphaTable = quantizeTable(Math.max(2, levels));
  const colorTable = colorLevels > 1 ? quantizeTable(colorLevels) : null;
  const cut = floor * 255;
  // Most of a layer is empty; whole pixels are skipped a word at a time.
  const words = new Uint32Array(data.buffer, data.byteOffset, width * height);
  const bounds = new BoundsBuilder();

  for (let y = 0; y < height; y++) {
    const row = ((y + originY) & 3) * 4;
    let p = y * width;

    for (let x = 0; x < width; x++, p++) {
      if (words[p] === 0) continue;
      const i = p * 4 + 3;
      const a = data[i] ?? 0;

      if (a === 0) continue;

      if (a < cut) {
        data[i] = 0;
        continue;
      }

      const bayer = (BAYER4[row + ((x + originX) & 3)] ?? 0) << 8;
      const quantized = alphaTable[bayer | a] ?? 0;
      data[i] = quantized;

      if (quantized === 0) continue;
      bounds.include(x, y);

      // Colour ramps band into a few flat tones, dithered at the seams like the alpha.
      if (colorTable) quantizeColor(data, i - 3, colorTable, bayer);
    }
  }

  return bounds.result();
}

/** The smallest rect holding every visible pixel of a buffer, inclusive. */
export interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Grows `PixelBounds` over pixels visited row by row, top to bottom. */
class BoundsBuilder {
  private left = Infinity;
  private top = Infinity;
  private right = -1;
  private bottom = -1;

  include(x: number, y: number): void {
    if (x < this.left) this.left = x;

    if (x > this.right) this.right = x;

    if (y < this.top) this.top = y;

    this.bottom = y;
  }

  result(): PixelBounds | null {
    return this.right < 0
      ? null
      : {
          left: this.left,
          top: this.top,
          right: this.right,
          bottom: this.bottom,
        };
  }
}

/** Where an RGBA buffer has any alpha, or null when it is all clear. */
export function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): PixelBounds | null {
  const words = new Uint32Array(data.buffer, data.byteOffset, width * height);
  const bounds = new BoundsBuilder();

  for (let y = 0, p = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p++) {
      if (words[p] !== 0 && data[p * 4 + 3]) bounds.include(x, y);
    }
  }

  return bounds.result();
}

const SQRT2 = Math.SQRT2;

/**
 * Distance in pixels from every pixel to the nearest solid one (0 on solid pixels), by a
 * two-pass chamfer with weights 1 and √2: close to Euclidean, linear in the pixel count.
 */
export function distanceField(
  solid: ArrayLike<boolean | number>,
  width: number,
  height: number,
): Float32Array {
  const far = width + height;
  const d = new Float32Array(width * height);

  for (let i = 0; i < d.length; i++) d[i] = solid[i] ? 0 : far;

  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height
      ? far
      : (d[y * width + x] ?? far);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      const current = d[i];

      if (!current) continue;
      d[i] = Math.min(
        current,
        at(x - 1, y) + 1,
        at(x, y - 1) + 1,
        at(x - 1, y - 1) + SQRT2,
        at(x + 1, y - 1) + SQRT2,
      );
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;

      const current = d[i];

      if (!current) continue;
      d[i] = Math.min(
        current,
        at(x + 1, y) + 1,
        at(x, y + 1) + 1,
        at(x + 1, y + 1) + SQRT2,
        at(x - 1, y + 1) + SQRT2,
      );
    }
  }

  return d;
}

/**
 * Which outline band a pixel at distance `d` falls in, or -1: a clean 1 px outline touching
 * the shape only orthogonally, a solid second ring, then a checkerboard and a sparse ordered
 * dither fading out, as pixel artists shade a glow.
 */
export function bandOf(d: number, x: number, y: number): number {
  if (d <= 0) return -1;

  if (d <= 1) return 0;

  if (d <= 2.5) return 1;

  if (d <= 4.3) return (x + y) & 1 ? -1 : 2;

  if (d <= 7.2)
    return (BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) <
      4 - Math.floor((d - 4.3) / 1.5)
      ? 3
      : -1;

  return -1;
}
