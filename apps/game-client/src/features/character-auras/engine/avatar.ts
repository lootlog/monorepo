/**
 * The admin's transformation: a giant of the character's own shape rising behind it, of
 * light, or of darkness for the auras of the will. Shown through the arrival and each
 * burst. One blit of the silhouette in one colour, built once per sprite frame and colour
 * while the giant shows.
 */
import { rgba, type Rgb } from "./math";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

/** How much bigger than the character the giant stands at its full height. */
const SCALE = 2.6;

const SHADOW: Rgb = [8, 4, 14];

const tinted = new WeakMap<AuraSilhouette, Map<string, HTMLCanvasElement>>();

/**
 * The silhouette's shape in `color` on a padded-silhouette-sized canvas: from its body
 * pixels, or its crisp mask for a cross-origin frame; null when it has neither.
 */
function tint(
  silhouette: AuraSilhouette,
  color: Rgb,
): HTMLCanvasElement | null {
  let byColor = tinted.get(silhouette);

  if (!byColor) {
    byColor = new Map();
    tinted.set(silhouette, byColor);
  }

  const key = color.join(",");
  const cached = byColor.get(key);

  if (cached) return cached;
  const width = silhouette.width + silhouette.pad * 2;
  const height = silhouette.height + silhouette.pad * 2;
  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);
  const { pixels, glow } = silhouette;

  if (pixels) {
    const image = ctx.createImageData(width, height);

    for (const [n, index] of pixels.body.entries()) {
      const i = index * 4;
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = pixels.bodyAlpha[n] ?? 0;
    }

    ctx.putImageData(image, 0, 0);
  } else if (glow) {
    ctx.drawImage(glow.sil, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = rgba(color, 1);
    ctx.fillRect(0, 0, width, height);
  } else return null;

  byColor.set(key, canvas);

  return canvas;
}

/**
 * Draws the giant behind the character at `place`, `strength` (0..1) grown and opaque:
 * dark when `dark`, else additive light in `color`.
 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  color: Rgb,
  dark: boolean,
  strength: number,
): void {
  const { silhouette } = place;
  const image = tint(silhouette, dark ? SHADOW : color);

  if (!image) return;
  const grow = SCALE * (0.8 + 0.2 * strength);
  const ox = place.x - silhouette.pad;
  const oy = place.y - silhouette.pad;
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = dark ? "source-over" : "lighter";
  ctx.globalAlpha = strength * (dark ? 0.55 : 0.4);
  ctx.drawImage(
    image,
    Math.round(place.feetX - (place.feetX - ox) * grow),
    Math.round(place.feetY - (place.feetY - oy) * grow),
    Math.round(image.width * grow),
    Math.round(image.height * grow),
  );
}
