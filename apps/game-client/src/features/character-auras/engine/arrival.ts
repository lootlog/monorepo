/**
 * An admin's arrival on the map, like a dragon landing: the whole map darkens round a
 * circle of light on the admin, the aura's burst falls in the dark, a shockwave rolls
 * out across the map, and the light comes back. Every `PULSE_EVERY` seconds after, a
 * shorter, fainter pulse of the same. Only while one runs is anything drawn.
 */
import { clamp } from "es-toolkit";
import { mulberry32, rgba, TAU, type Rgb } from "./math";
import { jagged } from "./paint";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas } from "./silhouette";

/** Seconds from the aura showing: dark by `DARK`, the burst at `BURST`, light again by `END`. */
const DARK = 0.5;

export const ARRIVAL_BURST = 0.55;

const SHOCK_START = 0.65;

const SHOCK_LENGTH = 1.3;

const LIGHT_BACK = 2.6;

const END = 3.6;

/** How dark the map gets at the arrival's height, 0..1. */
const DARKEST = 0.8;

/** The circle of light left round the admin, px; it reaches higher than wide. */
const LIGHT_RADIUS = 46;

const LIGHT_STRETCH = 1.9;

/** How far the shockwave rolls out over the ground, px. */
const SHOCK_REACH = 420;

const NIGHT: Rgb = [4, 2, 10];

/** Seconds between the pulses that follow the arrival. */
const PULSE_EVERY = 30;

/** A pulse runs its timeline this much faster than the arrival, and this much fainter. */
const PULSE_SPEED = 1.6;

const PULSE_STRENGTH = 0.6;

/**
 * Where the aura's map-wide event stands `age` seconds after it showed: the arrival's
 * timeline second `t` and the event's `strength`; null between events.
 */
export function mapEvent(age: number): { t: number; strength: number } | null {
  const pulse = Math.floor(age / PULSE_EVERY);
  const since = age - pulse * PULSE_EVERY;
  const t = pulse === 0 ? since : since * PULSE_SPEED;

  if (t >= END) return null;

  return { t, strength: pulse === 0 ? 1 : PULSE_STRENGTH };
}

/** Whether an event starts between `before` and `age` seconds: a pulse after the arrival. */
export function pulseStarted(before: number, age: number): boolean {
  return Math.floor(age / PULSE_EVERY) > Math.floor(before / PULSE_EVERY);
}

/** How dark the map is `t` seconds into an event's timeline, 0..1. */
function darknessAt(t: number): number {
  if (t >= END) return 0;

  if (t < DARK) return t / DARK;

  if (t < LIGHT_BACK) return 1;

  return 1 - (t - LIGHT_BACK) / (END - LIGHT_BACK);
}

/** How dark the aura's events make the map `age` seconds after it showed, 0..1. */
export function eventDarkness(age: number): number {
  const event = mapEvent(age);

  return event ? darknessAt(event.t) * event.strength : 0;
}

/** The night's circle of light, built once: clear in the middle, opaque night at its rim. */
let lightHole: HTMLCanvasElement | null = null;

const HOLE_RX = Math.round(LIGHT_RADIUS * 2.4);

const HOLE_RY = Math.round(HOLE_RX * LIGHT_STRETCH);

function holeSprite(): HTMLCanvasElement {
  if (lightHole) return lightHole;
  const canvas = createCanvas(HOLE_RX * 2, HOLE_RY * 2);
  const ctx = context2d(canvas);
  ctx.translate(HOLE_RX, HOLE_RY);
  ctx.scale(1, LIGHT_STRETCH);

  const gradient = ctx.createRadialGradient(
    0,
    0,
    LIGHT_RADIUS * 0.45,
    0,
    0,
    HOLE_RX,
  );

  gradient.addColorStop(0, rgba(NIGHT, 0));
  gradient.addColorStop(1, rgba(NIGHT, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(-HOLE_RX, -HOLE_RX, HOLE_RX * 2, HOLE_RX * 2);
  lightHole = canvas;

  return canvas;
}

/**
 * The night over the screen (`width` × `height`), `alpha` dark, with the circle of light
 * centred on (cx, cy): the prebuilt hole and four plain rects round it.
 */
export function drawNight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  alpha: number,
): void {
  const left = Math.round(cx - HOLE_RX);
  const top = Math.round(cy - HOLE_RY);
  const right = left + HOLE_RX * 2;
  const bottom = top + HOLE_RY * 2;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha;
  ctx.drawImage(holeSprite(), left, top);
  ctx.fillStyle = rgba(NIGHT, 1);
  ctx.fillRect(0, 0, width, Math.max(0, top));
  ctx.fillRect(0, bottom, width, Math.max(0, height - bottom));
  ctx.fillRect(0, top, Math.max(0, left), bottom - top);
  ctx.fillRect(right, top, Math.max(0, width - right), bottom - top);
}

/**
 * Darkens the screen (`width` × `height`) round the admin at `place` and rolls the
 * shockwave out from their feet, in the aura's `light` and `mid` tones.
 */
export function drawArrival(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  age: number,
  width: number,
  height: number,
  light: Rgb,
  mid: Rgb,
  tearing?: "will" | "quake",
): void {
  const event = mapEvent(age);

  if (!event) return;
  const darkness = darknessAt(event.t) * event.strength;

  if (darkness <= 0) return;
  const { bounds } = place.silhouette;
  const cx = place.x + bounds.x + bounds.w / 2;
  const cy = place.y + bounds.y + bounds.h * 0.45;
  drawNight(ctx, cx, cy, width, height, DARKEST * darkness);

  const shock = (event.t - SHOCK_START) / SHOCK_LENGTH;

  if (shock <= 0 || shock >= 1) return;

  if (tearing === "will")
    drawWillStorm(ctx, place, event.t, shock, darkness, mid);
  else if (tearing === "quake")
    drawQuakeCracks(ctx, place, shock, darkness, light);

  // Two rings rolling out over the ground, the leading one bright.
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 2;

  for (const [lag, color, strength] of [
    [0, light, 1],
    [0.12, mid, 0.6],
  ] as const) {
    const k = clamp(shock - lag, 0, 1);

    if (k <= 0) continue;
    const radius = 12 + (1 - (1 - k) ** 2) * SHOCK_REACH;
    ctx.globalAlpha = (1 - k) * strength;
    ctx.strokeStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.ellipse(
      Math.round(place.feetX),
      Math.round(place.feetY) - 2,
      radius,
      radius * 0.36,
      0,
      0,
      TAU,
    );
    ctx.stroke();
  }
}

/** Strokes the polyline `points` (x, y pairs) up to `share` of its points. */
function strokePath(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  share = 1,
): void {
  const count = Math.max(2, Math.ceil((points.length / 2) * share));
  ctx.beginPath();
  ctx.moveTo(points[0] ?? 0, points[1] ?? 0);

  for (let i = 1; i < count; i++)
    ctx.lineTo(points[i * 2] ?? 0, points[i * 2 + 1] ?? 0);
  ctx.stroke();
}

/**
 * The will: black lightning in a coloured rim lashing out from the admin across the map,
 * a new set every few frames while the shockwave rolls.
 */
function drawWillStorm(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  age: number,
  shock: number,
  darkness: number,
  rim: Rgb,
): void {
  const rng = mulberry32(Math.floor(age * 12));
  const { bounds } = place.silhouette;
  const x = place.x + bounds.x + bounds.w / 2;
  const y = place.y + bounds.y + bounds.h * 0.5;
  const reach = Math.min(1, shock * 2.5);
  const alpha = darkness * (1 - shock * 0.6);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  for (let i = 0; i < 7; i++) {
    const angle = rng() * TAU;
    const length = (140 + rng() * 260) * reach;

    const points = jagged(
      x,
      y,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length * 0.6,
      rng,
    );

    ctx.strokeStyle = rgba(rim, 0.85 * alpha);
    ctx.lineWidth = 3;
    strokePath(ctx, points);
    ctx.strokeStyle = rgba([0, 0, 0], alpha);
    ctx.lineWidth = 1.2;
    strokePath(ctx, points);
  }
}

/** A quake: cracks running out from the admin's feet across the ground, lit inside. */
function drawQuakeCracks(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  shock: number,
  darkness: number,
  light: Rgb,
): void {
  const rng = mulberry32(17);
  const x = place.feetX;
  const y = place.feetY - 2;
  const reveal = Math.min(1, shock * 3);

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * TAU + rng() * 0.5;
    const length = 160 + rng() * 260;

    const points = jagged(
      x,
      y,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length * 0.45,
      rng,
    );

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.9 * darkness;
    ctx.strokeStyle = rgba(NIGHT, 1);
    ctx.lineWidth = 3;
    strokePath(ctx, points, reveal);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = darkness * (1 - shock * 0.5);
    ctx.strokeStyle = rgba(light, 1);
    ctx.lineWidth = 1;
    strokePath(ctx, points, reveal);
  }
}
