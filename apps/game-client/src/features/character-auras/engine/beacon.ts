/**
 * The admin auras' beacon: a tall beam of light rising over the character, so players see
 * from across the map that an admin is there. It is one prebuilt sprite per aura, blitted
 * once a frame with a pulse of light climbing it, and costs no per-tick rendering.
 */
import { rgba, type Rgb } from "./math";
import { context2d, createCanvas } from "./silhouette";
import type { AuraPlacement } from "./placement";

/** How far the beam reaches above the character's shoulders, px. */
export const BEACON_HEIGHT = 300;

/** Half the beam's width, px: a bright core, a softer band and a faint haze. */
const HALF = 6;

/** Brightness steps up the beam, so it fades in bands like the rest of the pixel art. */
const LEVELS = 8;

const sprites = new Map<string, HTMLCanvasElement>();

/** The beam's colour and opacity `d` px from its centre line. */
function texel(d: number, light: Rgb, mid: Rgb): [Rgb, number] {
  if (d <= 1) return [light, 0.85];

  if (d <= 3) return [mid, 0.4];

  return [mid, 0.14 * (1 - (d - 4) / (HALF - 3))];
}

function buildSprite(light: Rgb, mid: Rgb): HTMLCanvasElement {
  const width = HALF * 2 + 1;
  const canvas = createCanvas(width, BEACON_HEIGHT);
  const ctx = context2d(canvas);
  const image = ctx.createImageData(width, BEACON_HEIGHT);

  for (let y = 0; y < BEACON_HEIGHT; y++) {
    // Faint at the top, strongest just over the character.
    const rise = Math.ceil((y / BEACON_HEIGHT) ** 1.6 * LEVELS) / LEVELS;

    for (let x = 0; x < width; x++) {
      const [color, alpha] = texel(Math.abs(x - HALF), light, mid);

      const i = (y * width + x) * 4;
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = Math.round(alpha * rise * 255);
    }
  }

  ctx.putImageData(image, 0, 0);

  return canvas;
}

/** Draws the beam of aura `id` over the character at `place` into the game's context. */
export function drawBeacon(
  ctx: CanvasRenderingContext2D,
  id: string,
  place: AuraPlacement,
  tones: readonly [Rgb, Rgb, Rgb],
  time: number,
  intensity: number,
): void {
  let sprite = sprites.get(id);

  if (!sprite) {
    sprite = buildSprite(tones[0], tones[1]);
    sprites.set(id, sprite);
  }

  const { bounds } = place.silhouette;
  const cx = Math.round(place.x + bounds.x + bounds.w / 2);
  const bottom = Math.round(place.y + bounds.y + bounds.h * 0.3);
  const top = bottom - BEACON_HEIGHT;

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = intensity * (0.75 + 0.25 * Math.sin(time * 2.2));
  ctx.drawImage(sprite, cx - HALF, top);

  // A pulse of light climbing the beam every two seconds, fading as it rises.
  const climb = (time * 0.5) % 1;
  ctx.globalAlpha = intensity * (1 - climb) * 0.9;
  ctx.fillStyle = rgba(tones[0], 1);
  ctx.fillRect(cx - 1, Math.round(bottom - climb * BEACON_HEIGHT) - 8, 3, 8);
}
