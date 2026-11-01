/**
 * Pixel-art finish for the aura layers: alpha snapped to a few hard levels with an ordered
 * (Bayer 4×4) dither, the way hand-drawn sprites shade glows, instead of smooth gradients.
 */

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/**
 * Quantizes the alpha of an RGBA buffer in place to `levels` steps (0 included). Pixels
 * under `floor` are cleared, so faint smears don't turn into stray dither dots. `originX`/
 * `originY` anchor the dither pattern to screen pixels, so it doesn't crawl as a buffer moves.
 * With `colorLevels`, each colour channel is quantized the same way.
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
): void {
  const steps = Math.max(1, levels - 1);
  const cut = floor * 255;
  const colorSteps = colorLevels > 1 ? colorLevels - 1 : 0;

  for (let y = 0; y < height; y++) {
    const row = ((y + originY) & 3) * 4;

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4 + 3;
      const a = data[i] ?? 0;

      if (a === 0) continue;

      if (a < cut) {
        data[i] = 0;
        continue;
      }

      const threshold = ((BAYER4[row + ((x + originX) & 3)] ?? 0) + 0.5) / 16;
      data[i] = Math.round(
        (Math.min(steps, Math.floor((a / 255) * steps + threshold)) / steps) *
          255,
      );

      // Colour ramps band into a few flat tones, dithered at the seams like the alpha.
      if (colorSteps) {
        for (let c = i - 3; c < i; c++) {
          data[c] = Math.round(
            (Math.min(
              colorSteps,
              Math.floor(((data[c] ?? 0) / 255) * colorSteps + threshold),
            ) /
              colorSteps) *
              255,
          );
        }
      }
    }
  }
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

/** Number of outline bands an aura is built from, inner to outer. */
export const BAND_COUNT = 4;

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
