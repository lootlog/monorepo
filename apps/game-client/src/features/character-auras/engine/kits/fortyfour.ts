/**
 * Czterdzieści i cztery: cats own this map. A cat sits by the character's feet, glowing
 * paw prints walk over the whole map in four trails of eleven, and cats sit in the
 * bottom corners of the screen, tails swaying. Its burst is a paw as big as the screen
 * raking four glowing scars across the map, and then forty-four cats run across it.
 */
import { sprite } from "../decor";
import { mulberry32, rgba, type Rgb } from "../math";
import { wash } from "../sky";
import { span, type AuraKit } from "./kit";

const DUSK: Rgb = [14, 8, 24];

const GLOW: Rgb = [255, 190, 90];

const FUR: Rgb = [22, 18, 28];

const CLAW: Rgb = [255, 250, 230];

/** Trails of prints over the map, and prints in each: forty-four in all. */
const TRAILS = 4;

const PRINTS = 11;

const CATS = 44;

const CAT_SIT = ["#   #", "#####", "#o#o#", "#####", " ###", " ###", "#####"];

const CAT_BLINK = ["#   #", "#####", "#####", "#####", " ###", " ###", "#####"];

/** One paw print at (`x`, `y`) heading along `angle`: a pad and three toes. */
function print(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 4);

  for (const side of [-1, 0, 1])
    ctx.fillRect(
      Math.round(x + cos * 5 - sin * side * 3) - 1,
      Math.round(y + sin * 5 + cos * side * 3) - 1,
      2,
      2,
    );
}

/** A cat sitting with its back to us at (`x`, `y`), `size` px tall, its tail swung by `sway`. */
function sitter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  sway: number,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.3, size * 0.3, size * 0.34, 0, 0, Math.PI * 2);
  ctx.arc(x, y - size * 0.74, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * size * 0.19, y - size * 0.82);
    ctx.lineTo(x + side * size * 0.17, y - size * 1.04);
    ctx.lineTo(x + side * size * 0.04, y - size * 0.9);
    ctx.fill();
  }

  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.24, y - size * 0.06);
  ctx.quadraticCurveTo(
    x + size * 0.6,
    y,
    x + size * (0.5 + sway * 0.2),
    y - size * 0.45,
  );
  ctx.stroke();
}

export const fortyfour: AuraKit = {
  gloom: 0.22,
  veil: DUSK,
  burst: { length: 2.6, release: 0.3 },

  pieces(b, place, front) {
    if (!front) return;
    // The cat by the feet, on whichever side the walk leaves behind, blinking.
    const side = b.lag.x > 1 ? 1 : -1;
    sprite(
      b.dim(),
      place.feetX + side * (place.silhouette.bounds.w / 2 + 6),
      place.feetY - 4,
      b.tick % 40 < 2 ? CAT_BLINK : CAT_SIT,
      { "#": FUR, o: GLOW },
      b.intensity,
    );
  },

  sky(scene) {
    const { ctx, width, height, now, view, burst, mid } = scene;
    wash(scene, DUSK, 0.22);

    // Four trails of eleven prints walking over the map, the oldest prints fading.
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(mid, 1);

    for (let trail = 0; trail < TRAILS; trail++) {
      for (let k = 0; k < PRINTS; k++) {
        const s = now * 46 - k * 26 + trail * 400;
        const heading = Math.cos(s * 0.008 + trail) * 0.5;

        const px =
          ((((s + trail * 331 - view[0]) % (width + 80)) + width + 80) %
            (width + 80)) -
          40;

        const py =
          ((((trail * 197 + Math.sin(s * 0.008 + trail) * 70 - view[1]) %
            height) +
            height) %
            height) +
          (k % 2 ? 5 : -5);

        ctx.globalAlpha = 0.7 * (1 - k / PRINTS);
        print(ctx, px, py, heading);
      }
    }

    // A cat in each bottom corner, its tail swaying.
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = rgba(FUR, 1);
    ctx.strokeStyle = rgba(FUR, 1);
    sitter(ctx, 56, height + 6, 110, Math.sin(now * 1.4));
    sitter(ctx, width - 70, height + 6, 84, Math.sin(now * 1.1 + 2));

    if (burst < 0) return;
    // The paw: four claws raking down across the screen, their scars glowing after.
    const rake = span(burst, 0, 0.3);
    const scar = 1 - span(burst, 0.3, 0.8);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let claw = 0; claw < 4; claw++) {
      const x0 = width * (0.2 + claw * 0.13);
      const reach = Math.min(1, rake * 1.3 - claw * 0.06);

      if (reach <= 0) continue;

      for (const [color, lineWidth, alpha] of [
        [GLOW, 16, 0.3],
        [CLAW, 4, 1],
      ] as const) {
        ctx.globalAlpha = alpha * scar;
        ctx.strokeStyle = rgba(color, 1);
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x0, height * 0.08);
        ctx.quadraticCurveTo(
          x0 + width * 0.2,
          height * 0.4,
          x0 + width * 0.3 * reach + width * 0.02,
          height * (0.08 + 0.84 * reach),
        );
        ctx.stroke();
      }
    }

    // Forty-four cats running across, each at its own pace.
    const run = span(burst, 0.3, 1);

    if (run <= 0) return;
    const rng = mulberry32(44);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = rgba(FUR, 1);

    for (let i = 0; i < CATS; i++) {
      const cx = -60 + run * (width + 240) * (0.7 + rng() * 0.7) - rng() * 160;
      const cy = Math.round(rng() * height);
      const leap = Math.round(Math.abs(Math.sin(now * 14 + i)) * 4);
      // Body, head, ears, tail and legs flung out in the leap.
      ctx.fillRect(cx, cy - leap, 14, 5);
      ctx.fillRect(cx + 12, cy - 4 - leap, 6, 6);
      ctx.fillRect(cx + 12, cy - 6 - leap, 2, 2);
      ctx.fillRect(cx + 16, cy - 6 - leap, 2, 2);
      ctx.fillRect(cx - 6, cy - 3 - leap, 7, 2);
      ctx.fillRect(cx + (leap > 2 ? -3 : 1), cy + 5 - leap, 2, 3);
      ctx.fillRect(cx + (leap > 2 ? 15 : 11), cy + 5 - leap, 2, 3);
    }
  },
};
