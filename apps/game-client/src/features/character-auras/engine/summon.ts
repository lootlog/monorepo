/**
 * An admin's arrival at their own feet: a ring of light closes in under them, the
 * character flares up as the aura bursts, and sparks rise from the ring. Drawn round the
 * character only, in strokes and one blit of the silhouette built once per sprite frame.
 */
import { clamp } from "es-toolkit";
import { ARRIVAL_BURST } from "./arrival";
import { mulberry32, rgba, TAU, type Rgb } from "./math";
import { groundRadius, type AuraPlacement } from "./placement";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

/** How much wider than the ground piece the ring starts. */
const RING_FROM = 2.6;

/** The flare over the character, seconds after the burst. */
const FLARE_LENGTH = 0.35;

const SPARKS = 16;

/** Seconds a spark rises, and how high, px. */
const SPARK_LIFE = 0.9;

const SPARK_RISE = 64;

/** Seconds after the burst the last spark leaves the ring. */
const SPARK_SPREAD = 0.5;

/** The summoning `t` s into an arrival of `strength`, in the aura's light and mid tones. */
export type Summon = {
  t: number;
  strength: number;
  light: Rgb;
  mid: Rgb;
};

const tinted = new WeakMap<AuraSilhouette, Map<string, HTMLCanvasElement>>();

/**
 * The silhouette's shape in `color` on a padded-silhouette-sized canvas: from its body
 * pixels, or its crisp mask for a cross-origin frame; null when it has neither.
 */
export function tintedSilhouette(
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

/** Strokes the ground ellipse of radius `rx` round the feet at `place`. */
function strokeRing(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  rx: number,
): void {
  ctx.beginPath();
  ctx.ellipse(
    Math.round(place.feetX),
    Math.round(place.feetY) - 2,
    rx,
    rx * 0.36,
    0,
    0,
    TAU,
  );
  ctx.stroke();
}

/** The sparks behind the feet (`front` false) or before them, rising from the ring. */
function drawSparks(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  summon: Summon,
  front: boolean,
): void {
  const rng = mulberry32(7);
  const radius = groundRadius(place);
  const x0 = place.feetX;
  const y0 = place.feetY - 2;

  for (let i = 0; i < SPARKS; i++) {
    const angle = (i / SPARKS) * TAU + rng() * 0.3;
    const delay = rng() * SPARK_SPREAD;
    const tall = 4 + Math.round(rng() * 6);
    const color = rng() < 0.6 ? summon.light : summon.mid;

    if (Math.sin(angle) > 0 !== front) continue;
    const k = (summon.t - ARRIVAL_BURST - delay) / SPARK_LIFE;

    if (k <= 0 || k >= 1) continue;
    const rise = (1 - (1 - k) ** 2) * SPARK_RISE;
    const x = Math.round(x0 + Math.cos(angle) * radius);
    const y = Math.round(y0 + Math.sin(angle) * radius * 0.36 - rise);
    const alpha = summon.strength * (1 - k);
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = rgba(summon.mid, 1);
    ctx.fillRect(x - 1, y - tall - 1, 3, tall + 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rgba(color, 1);
    ctx.fillRect(x, y - tall, 1, tall);
  }
}

/** The ring closing in under the character and the sparks behind it. */
export function drawSummonBack(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  summon: Summon,
): void {
  const radius = groundRadius(place);
  ctx.globalCompositeOperation = "lighter";

  if (summon.t < ARRIVAL_BURST + 0.4) {
    const k = clamp(summon.t / ARRIVAL_BURST, 0, 1);
    // After the ring closes, it lingers on the ground piece and fades.
    const fade = clamp((summon.t - ARRIVAL_BURST) / 0.4, 0, 1);
    const rx = radius * (RING_FROM - (RING_FROM - 1) * k * k);
    const alpha = summon.strength * (0.35 + 0.65 * k) * (1 - fade);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(summon.mid, 1);
    ctx.globalAlpha = alpha * 0.5;
    strokeRing(ctx, place, rx);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(summon.light, 1);
    ctx.globalAlpha = alpha;
    strokeRing(ctx, place, rx);
  }

  drawSparks(ctx, place, summon, false);
}

/** The character flaring up as the aura bursts, and the sparks before it. */
export function drawSummonFront(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  summon: Summon,
): void {
  ctx.globalCompositeOperation = "lighter";
  // A tenth of a second up to the burst, then fading out.
  const since = summon.t - ARRIVAL_BURST;
  const flare = since < 0 ? 1 + since / 0.1 : 1 - since / FLARE_LENGTH;

  const image =
    flare > 0 ? tintedSilhouette(place.silhouette, summon.light) : null;

  if (image) {
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = summon.strength * 0.5 * flare;
    ctx.drawImage(
      image,
      Math.round(place.x - place.silhouette.pad),
      Math.round(place.y - place.silhouette.pad),
    );
  }

  drawSparks(ctx, place, summon, true);
}
