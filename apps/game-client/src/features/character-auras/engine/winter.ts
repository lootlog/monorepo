/**
 * Władca Zimy: a crown of ice over the head, snowflakes circling the body, rime spreading
 * from the feet and, while the admin is on the map, a blizzard over all of it with frost
 * growing in from the corners of the screen. Its burst freezes the ground: spikes of ice
 * shoot up round the character, shatter, and a wave of cold rolls over the map.
 */
import { clamp } from "es-toolkit";
import { mulberry32, noise1, rgba, smoothstep, TAU, type Rgb } from "./math";
import {
  ORTHO,
  DIAG,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  plot,
  softEllipse,
} from "./paint";
import type { Brush, TipFrame } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import { context2d, createCanvas } from "./silhouette";
import { groundWave, scatter, wash, type MapScene } from "./sky";

const WHITE: Rgb = [255, 255, 255];

const ICE: Rgb = [176, 224, 255];

const ICE_DEEP: Rgb = [70, 140, 226];

/** The spikes stand between these fractions of the burst, then shatter. */
const SPIKES_UP = 0.18;

export const SPIKES_SHATTER = 0.7;

/** How tall the burst's spikes stand, 0..1, at `burst` (0..1, -1 resting). */
function spikeGrowth(burst: number): number {
  if (burst < 0 || burst > SPIKES_SHATTER) return 0;

  // Shot up fast, a little past their height, then standing.
  return burst < SPIKES_UP
    ? (burst / SPIKES_UP) ** 0.5 * 1.1
    : 1 + 0.1 * (1 - smoothstep(SPIKES_UP, SPIKES_UP + 0.1, burst));
}

/** A pixel snowflake: four long arms, four short ones and barbs when `size` allows. */
function snowflake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: Rgb,
  alpha: number,
): void {
  plot(ctx, x, y, WHITE, alpha);

  for (const [dx, dy] of ORTHO)
    for (let i = 1; i <= size; i++)
      plot(ctx, x + dx * i, y + dy * i, i === size ? color : WHITE, alpha);

  for (const [dx, dy] of DIAG)
    for (let i = 1; i < size; i++)
      plot(ctx, x + dx * i, y + dy * i, color, alpha * 0.8);
}

// --- round the character ------------------------------------------------------------------------

/** Rime on the ground: a pale disc and branching frost growing out from the feet. */
export function drawRime(b: Brush, place: AuraPlacement, burst: number): void {
  const lit = b.lit();
  const a = b.intensity;
  const reach = 1.25 + spikeGrowth(burst) * 0.35;
  const rx = groundRadius(place) * reach;
  const ry = rx * 0.38;
  const cx = Math.round(place.feetX);
  const cy = Math.round(place.feetY) - 2;

  softEllipse(lit, cx, cy, rx * 1.05, ry * 1.05, ICE_DEEP, 0.4 * a);
  softEllipse(lit, cx, cy, rx * 0.5, ry * 0.5, WHITE, 0.3 * a);
  pixelEllipse(lit, cx, cy, rx, ry, ICE, 0.45 * a, 0, 3);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TAU + 0.26;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tipX = cx + cos * rx;
    const tipY = cy + sin * ry;
    pixelLine(
      lit,
      cx + cos * rx * 0.2,
      cy + sin * ry * 0.2,
      tipX,
      tipY,
      WHITE,
      a,
      0.7 * a,
    );

    // Two pairs of twigs off each branch, the outer pair shorter.
    for (const [at, length] of [
      [0.5, 0.3],
      [0.78, 0.2],
    ] as const) {
      for (const side of [-1, 1]) {
        const twig = angle + side * 0.9;
        pixelLine(
          lit,
          cx + cos * rx * at,
          cy + sin * ry * at,
          cx + cos * rx * at + Math.cos(twig) * rx * length,
          cy + sin * ry * at + Math.sin(twig) * ry * length,
          ICE,
          0.85 * a,
          0.4 * a,
        );
      }
    }

    if ((b.tick + i * 4) % 23 < 2)
      pixelGlint(lit, tipX, tipY, 2, WHITE, ICE, a);
  }
}

/** Heights of the crown's crystals, left to right. */
const CROWN_SPIKES = [3, 6, 4, 8, 4, 6, 3] as const;

/** A crown of ice crystals floating over the head, one pixel higher while `raised`. */
export function drawIceCrown(
  b: Brush,
  place: AuraPlacement,
  raised: boolean,
): void {
  const { head } = place.silhouette;
  const lit = b.lit();
  const dim = b.dim();
  const a = b.intensity;
  const left = Math.round(place.x + head.x + b.lag.x * 0.5) - 6;

  const base =
    Math.round(place.y + head.y + b.lag.y * 0.5) - 4 - (raised ? 1 : 0);

  for (const [i, height] of CROWN_SPIKES.entries()) {
    const x = left + i * 2;

    // Each crystal two pixels wide: a lit face and a shaded one, solid so it reads on snow.
    for (let h = 0; h < height; h++) {
      plot(dim, x, base - h, h > height - 3 ? WHITE : ICE, a);
      plot(dim, x + 1, base - h, h === height - 1 ? ICE : ICE_DEEP, a);
    }

    plot(lit, x, base - height, WHITE, 0.7 * a);
  }

  for (let i = -1; i < CROWN_SPIKES.length * 2 + 1; i++) {
    plot(dim, left + i, base + 1, i % 3 === 0 ? WHITE : ICE, a);
    plot(dim, left + i, base + 2, ICE_DEEP, a);
  }

  const glint = Math.floor(b.tick / 2) % 16;

  if (glint < CROWN_SPIKES.length)
    pixelGlint(
      lit,
      left + glint * 2,
      base - (CROWN_SPIKES[glint] ?? 0),
      2,
      WHITE,
      ICE,
      a,
    );
}

/** Three snowflakes circling the body on a tilted ring; the far ones go behind it. */
export function drawSnowOrbit(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
): void {
  const { bounds } = place.silhouette;
  const a = b.intensity;
  const cx = place.x + bounds.x + bounds.w / 2;
  const cy = place.y + bounds.y + bounds.h * 0.48;
  const rx = bounds.w / 2 + 15;
  const ry = rx * 0.32;

  for (let i = 0; i < 3; i++) {
    const angle = b.time * 0.9 + (i / 3) * TAU;
    const depth = Math.sin(angle);

    if (depth > 0 !== front) continue;
    const ox = Math.cos(angle) * rx;
    // Bobbing on its own beat as it goes round.
    const bob = Math.round(noise1(b.time * 0.8 + i * 5, 41) * 2);
    snowflake(
      b.lit(),
      Math.round(cx + ox),
      Math.round(cy + depth * ry - ox * 0.12 + bob),
      depth > 0 ? 3 : 2,
      ICE,
      (depth > 0 ? 1 : 0.7) * a,
    );
  }
}

/** One crystal: a tall triangle with a lit left face, in the layer's current transform. */
function crystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  half: number,
  lean: number,
  alpha: number,
): void {
  ctx.fillStyle = rgba(ICE_DEEP, 0.92 * alpha);
  ctx.beginPath();
  ctx.moveTo(x - half, y + 1);
  ctx.lineTo(x + lean, y - height);
  ctx.lineTo(x + half, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba([236, 250, 255], 0.95 * alpha);
  ctx.beginPath();
  ctx.moveTo(x - half + 1, y);
  ctx.lineTo(x + lean, y - height + 1);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Ice round the feet: a ring of small crystals always, and the burst's tall spikes
 * shooting up between them. Those behind the feet (`front` false) draw before the
 * character.
 */
export function drawIceRing(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  burst: number,
): void {
  const rx = groundRadius(place);
  const ry = rx * 0.38;
  const ctx = b.lit();
  const a = b.intensity;
  const growth = spikeGrowth(burst);
  const count = 12;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + 0.3;
    const depth = Math.sin(angle);

    if (depth > 0 !== front) continue;
    const cos = Math.cos(angle);
    const small = 4 + ((i * 7919) % 5);
    crystal(
      ctx,
      Math.round(place.feetX + cos * rx * 0.95),
      Math.round(place.feetY - 2 + depth * ry * 0.95),
      small,
      2,
      Math.round(cos * 2),
      a,
    );

    if (growth <= 0 || i % 2) continue;
    // The burst's spikes stand further out, leaning away from the character.
    const tall = Math.round((16 + ((i * 104729) % 9)) * growth);
    const x = Math.round(place.feetX + cos * rx * 1.5);
    const y = Math.round(place.feetY - 2 + depth * ry * 1.5);
    crystal(ctx, x, y, tall, 3, Math.round(cos * 5), a);

    if ((b.tick + i) % 3 === 0)
      pixelGlint(ctx, x + Math.round(cos * 5), y - tall, 2, WHITE, ICE, a);
  }
}

// --- the blizzard over the map ------------------------------------------------------------------

/** How much the blizzard dims the map, 0..1. */
export const BLIZZARD_GLOOM = 0.3;

/** The overcast: a cold grey-blue, so the map looks snowed in rather than dark. */
export const BLIZZARD_VEIL: Rgb = [128, 156, 196];

const FROST_SIZE = 150;

let frostSprite: HTMLCanvasElement | null = null;

/** Frost grown from a corner: branching dendrites over a pale bloom, built once. */
function frost(): HTMLCanvasElement {
  if (frostSprite) return frostSprite;
  const canvas = createCanvas(FROST_SIZE, FROST_SIZE);
  const ctx = context2d(canvas);
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, FROST_SIZE * 0.8);
  bloom.addColorStop(0, "rgba(232,246,255,0.6)");
  bloom.addColorStop(0.4, "rgba(200,230,255,0.18)");
  bloom.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, FROST_SIZE, FROST_SIZE);
  ctx.fillStyle = "#ffffff";
  const rng = mulberry32(1812);

  // A straight needle with twigs off both sides at sixty degrees, each a smaller needle.
  const needle = (
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
  ) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const every = depth ? 5 : 9;

    for (let step = 0; step < length; step++) {
      const px = x + cos * step;
      const py = y + sin * step;
      const reach = Math.hypot(px, py) / FROST_SIZE;

      if (reach > 0.97) return;
      ctx.globalAlpha = clamp(1.1 - reach * 1.1, 0, 1) * (depth ? 0.75 : 1);
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);

      if (depth < 2 && step > 4 && step % every === 0) {
        const twig =
          (length - step) * (depth ? 0.3 : 0.38) * (0.6 + rng() * 0.4);

        needle(px, py, angle + 1.05, twig, depth + 1);
        needle(px, py, angle - 1.05, twig, depth + 1);
      }
    }
  };

  for (let i = 0; i < 6; i++)
    needle(0, 0, (i / 5) * (Math.PI / 2), FROST_SIZE * (0.5 + rng() * 0.45), 0);
  frostSprite = canvas;

  return canvas;
}

/** Flakes of one depth: how big its cells are, how fast it falls and how it looks. */
const SNOW_LAYERS = [
  { cell: 28, seed: 31, depth: 0.5, vx: -26, vy: 58, size: 1, alpha: 0.9 },
  { cell: 42, seed: 37, depth: 1, vx: -52, vy: 112, size: 2, alpha: 1 },
  { cell: 110, seed: 41, depth: 1.4, vx: -90, vy: 170, size: 3, alpha: 0.9 },
] as const;

/**
 * The blizzard over the whole map: a cold overcast, two depths of snow driven by the
 * wind, frost growing in from the corners of the screen and, when the aura bursts, a
 * gust, a pale flash and a wave of cold rolling out from the character.
 */
export function drawBlizzard(scene: MapScene): void {
  const { ctx, width, height, now, view, burst } = scene;
  const freeze = burst >= 0 ? Math.sin(Math.PI * clamp(burst * 1.2, 0, 1)) : 0;

  wash(scene, BLIZZARD_VEIL, BLIZZARD_GLOOM);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#ffffff";

  for (const layer of SNOW_LAYERS) {
    // The flakes fall through the field, so the window into it runs the other way.
    const left = view[0] * layer.depth - now * layer.vx;
    const top = view[1] * layer.depth - now * layer.vy;

    scatter(left, top, width, height, layer.cell, layer.seed, (x, y, p, q) => {
      ctx.globalAlpha = layer.alpha * (0.6 + q * 0.4);
      // Each flake swings on its own beat as it falls.
      const sway = Math.sin(now * (1.2 + p * 2) + q * 30) * 5 * layer.depth;
      ctx.fillRect(Math.round(x + sway), Math.round(y), layer.size, layer.size);
    });
  }

  // Frost in the four corners, breathing, and surging inwards with a burst.
  const sprite = frost();
  const scale = 1 + freeze * 0.35;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clamp(
    0.6 + 0.12 * Math.sin(now * 0.7) + freeze * 0.3,
    0,
    1,
  );

  for (const [fx, fy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    ctx.save();
    ctx.translate(fx > 0 ? 0 : width, fy > 0 ? 0 : height);
    ctx.scale(fx * scale, fy * scale);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();
  }

  if (burst < 0) return;

  // The gust: streaks of snow racing across the screen.
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ffffff";
  const gust = mulberry32(53);

  for (let i = 0; i < 26; i++) {
    const y = gust() * height;
    const length = 30 + gust() * 70;

    const x =
      width * (1.3 - burst * (1.6 + gust() * 1.4)) + gust() * width * 0.6;

    ctx.globalAlpha = 0.35 * freeze;
    ctx.fillRect(Math.round(x), Math.round(y + (width - x) * 0.12), length, 1);
  }

  wash(scene, WHITE, 0.22 * (1 - burst) ** 4, "lighter");
  groundWave(
    scene,
    burst * Math.max(width, height) * 0.7,
    WHITE,
    ICE,
    (1 - burst) ** 1.5,
  );
}

// --- the tooltip --------------------------------------------------------------------------------

/** Snow lying on the top edge in uneven drifts, and a snowflake on the top right corner. */
export function drawTipSnow({ b, L, T, W, R, a }: TipFrame): void {
  const dim = b.dim();

  for (let x = L - 1; x <= L + W; x++) {
    const drift = 1 + Math.round((noise1(x * 0.21, 61) + 1) * 1.4);

    for (let h = 0; h < drift; h++)
      plot(dim, x, T - 1 - h, h === drift - 1 ? WHITE : ICE, a);
  }

  snowflake(b.lit(), R + 4, T - 5, b.tick % 20 < 10 ? 3 : 2, ICE, a);
}
