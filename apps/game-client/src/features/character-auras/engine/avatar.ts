/**
 * The admin's transformation: a giant of the character's own shape rising behind it, of
 * light, or of darkness for the auras of the will. Shown through the arrival and each
 * burst. One blit of a tinted silhouette, tinted once per sprite frame and colour.
 */
import { rgba, type Rgb } from "./math";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas } from "./silhouette";

/** How much bigger than the character the giant stands at its full height. */
const SCALE = 2.6;

const SHADOW: Rgb = [8, 4, 14];

const tinted = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

function tint(sil: HTMLCanvasElement, color: Rgb): HTMLCanvasElement {
  let byColor = tinted.get(sil);

  if (!byColor) {
    byColor = new Map();
    tinted.set(sil, byColor);
  }

  const key = color.join(",");
  let canvas = byColor.get(key);

  if (!canvas) {
    canvas = createCanvas(sil.width, sil.height);
    const ctx = context2d(canvas);
    ctx.drawImage(sil, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = rgba(color, 1);
    ctx.fillRect(0, 0, sil.width, sil.height);
    byColor.set(key, canvas);
  }

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
  const image = tint(silhouette.sil, dark ? SHADOW : color);
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
    Math.round(silhouette.sil.width * grow),
    Math.round(silhouette.sil.height * grow),
  );
}
