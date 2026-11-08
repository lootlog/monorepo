/**
 * Gromowładca's storm over the whole map while the admin is on it: an overcast sky,
 * cloud shadows drifting over the ground, and lightning striking somewhere on screen
 * every few seconds with a flash. One fill, a few sprite blits and, during a strike, a
 * few strokes a frame.
 */
import { mulberry32, rgba, type Rgb } from "./math";
import { jagged } from "./paint";
import { context2d, createCanvas } from "./silhouette";

/** How much the overcast darkens the map, 0..1. */
export const STORM_GLOOM = 0.32;

const OVERCAST: Rgb = [16, 22, 38];

/** A cloud shadow: a soft dark blob. */
const CLOUD_W = 200;

const CLOUD_H = 90;

const CLOUDS = 5;

/** Seconds between chances of a strike, and how long a strike lights up. */
const STRIKE_EVERY = 1.7;

const STRIKE_LENGTH = 0.22;

let cloudSprite: HTMLCanvasElement | null = null;

function cloud(): HTMLCanvasElement {
  if (cloudSprite) return cloudSprite;
  const canvas = createCanvas(CLOUD_W, CLOUD_H);
  const ctx = context2d(canvas);
  ctx.translate(CLOUD_W / 2, CLOUD_H / 2);
  ctx.scale(1, CLOUD_H / CLOUD_W);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, CLOUD_W / 2);
  gradient.addColorStop(0, rgba(OVERCAST, 1));
  gradient.addColorStop(1, rgba(OVERCAST, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(-CLOUD_W / 2, -CLOUD_W / 2, CLOUD_W, CLOUD_W);
  cloudSprite = canvas;

  return canvas;
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * Draws the storm over the screen (`width` × `height`); `view` is the camera, so the
 * cloud shadows stay on the map as it scrolls.
 */
export function drawStorm(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  view: readonly [number, number],
  light: Rgb,
  mid: Rgb,
): void {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = STORM_GLOOM;
  ctx.fillStyle = rgba(OVERCAST, 1);
  ctx.fillRect(0, 0, width, height);

  // Cloud shadows drifting east with the wind.
  ctx.globalAlpha = 0.3;
  const sprite = cloud();

  for (let i = 0; i < CLOUDS; i++) {
    const x = wrap(i * 277 + time * 12 - view[0], width + CLOUD_W * 2);
    const y = wrap(i * 191 - view[1], height + CLOUD_H * 2);
    ctx.drawImage(sprite, x - CLOUD_W, y - CLOUD_H);
  }

  const slot = Math.floor(time / STRIKE_EVERY);
  const rng = mulberry32(slot * 7919 + 3);

  // Most chances strike, at a random moment in their slot.
  if (rng() < 0.3) return;
  const k = (time - slot * STRIKE_EVERY - rng() * 1.1) / STRIKE_LENGTH;

  if (k < 0 || k >= 1) return;
  const x = rng() * width;
  const y = height * (0.35 + rng() * 0.55);
  const points = jagged(x + (rng() - 0.5) * 90, -10, x, y, rng);
  const fade = 1 - k;

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.2 * fade;
  ctx.fillStyle = rgba(light, 1);
  ctx.fillRect(0, 0, width, height);

  for (const [color, lineWidth, alpha] of [
    [mid, 4, 0.6],
    [light, 1.5, 1],
  ] as const) {
    ctx.globalAlpha = alpha * fade;
    ctx.strokeStyle = rgba(color, 1);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0] ?? 0, points[1] ?? 0);

    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i] ?? 0, points[i + 1] ?? 0);
    ctx.stroke();
  }
}
