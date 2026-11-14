/**
 * Władca Czasu: a clock face on the ground under the feet whose hand jumps from mark to
 * mark, brass gears turning behind the shoulders in notches, and echoes of the character
 * where it stood a moment ago. Its burst stops time: the hand winds up, the whole map
 * loses its colour and everything the aura moves stands still, the hand running backwards,
 * until time snaps back.
 */
import { smoothstep, rgba, TAU, type Rgb } from "./math";
import {
  pixelEllipse,
  pixelGlint,
  pixelLine,
  plot,
  softEllipse,
} from "./paint";
import type { Brush, TipFrame } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import type { AuraSilhouette } from "./silhouette";
import { groundWave, wash, washAround, type MapScene } from "./sky";
import { tintedSilhouette } from "./summon";

const WHITE: Rgb = [255, 255, 255];

const BRASS_LIGHT: Rgb = [255, 226, 150];

const BRASS: Rgb = [214, 160, 70];

const BRASS_DARK: Rgb = [116, 76, 26];

/** Time stands still between these fractions of the burst. */
export const STOP_FROM = 0.12;

export const STOP_TO = 0.85;

/** How long the burst runs, s; the renderer's `BURST_DURATION` takes it from here. */
export const TIMESTOP_LENGTH = 2.6;

/** How still time stands, 0..1, at `burst` (0..1, -1 resting). */
export function stillness(burst: number): number {
  if (burst < 0) return 0;

  return (
    smoothstep(STOP_FROM, STOP_FROM + 0.04, burst) *
    (1 - smoothstep(STOP_TO - 0.04, STOP_TO, burst))
  );
}

// --- the clock ----------------------------------------------------------------------------------

/** Seconds the long hand takes round the face: one mark a second. */
const HAND_TURN = 12;

/** A point on the face lying on the ground: `reach` 0..1 from its centre along `angle`. */
function onFace(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
  reach: number,
): [number, number] {
  return [cx + Math.cos(angle) * rx * reach, cy + Math.sin(angle) * ry * reach];
}

/**
 * The clock face under the feet. `clock` is the aura's time, held while time stands
 * still; `burst` winds the hand up before the stop and runs it backwards during it.
 */
export function drawClockFace(
  b: Brush,
  place: AuraPlacement,
  clock: number,
  burst: number,
): void {
  const lit = b.lit();
  const [light, mid] = b.tones;
  const a = b.intensity;
  const still = stillness(burst);
  const rx = Math.round(groundRadius(place) * (1.3 + still * 0.25));
  const ry = Math.round(rx * 0.38);
  const cx = Math.round(place.feetX);
  const cy = Math.round(place.feetY) - 2;

  softEllipse(lit, cx, cy, rx * 1.1, ry * 1.1, mid, (0.3 + still * 0.3) * a);
  pixelEllipse(lit, cx, cy, rx, ry, light, a, 0, 1);
  pixelEllipse(
    lit,
    cx,
    cy,
    Math.round(rx * 0.86),
    Math.round(ry * 0.86),
    mid,
    0.6 * a,
    0,
    2,
  );

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TAU - Math.PI / 2;
    const quarter = i % 3 === 0;
    const [x0, y0] = onFace(cx, cy, rx, ry, angle, quarter ? 0.66 : 0.76);
    const [x1, y1] = onFace(cx, cy, rx, ry, angle, 0.86);
    pixelLine(lit, x0, y0, x1, y1, quarter ? BRASS_LIGHT : BRASS, a, a);
  }

  // The long hand lands on a mark each second, a touch past it on the first tick.
  const whole = Math.floor(clock);
  const kick = clock - whole < 0.15 ? 0.2 : 0;

  // Wound up before the stop, then back a mark every third of a second.
  const windUp =
    burst >= 0 && burst < STOP_FROM ? (burst / STOP_FROM) ** 2 * 14 : 0;

  const rewind = still > 0 ? Math.floor((b.time - clock) / 0.3) : 0;
  const mark = whole + kick + windUp - rewind;
  const long = (mark / HAND_TURN) * TAU - Math.PI / 2;
  const short = (clock / (HAND_TURN * 12)) * TAU + 0.6;
  const [sx, sy] = onFace(cx, cy, rx, ry, short, 0.45);
  const [lx, ly] = onFace(cx, cy, rx, ry, long, 0.82);
  pixelLine(lit, cx, cy, sx, sy, BRASS, a, a);
  pixelLine(lit, cx, cy - 1, sx, sy - 1, BRASS_DARK, 0.8 * a, 0.8 * a);
  pixelLine(lit, cx, cy, lx, ly, light, a, a);
  pixelGlint(lit, lx, ly, kick || still ? 2 : 1, WHITE, light, a);
  plot(lit, cx, cy, WHITE, a);
}

// --- the gears ----------------------------------------------------------------------------------

/** Notches a gear turns by each second, so it moves like clockwork, not like a wheel. */
const NOTCHES = 5;

/** A brass gear of `teeth` teeth round (`x`, `y`), turned to `angle`. */
function drawGear(
  b: Brush,
  x: number,
  y: number,
  r: number,
  teeth: number,
  angle: number,
  a: number,
): void {
  const dim = b.dim();
  const count = Math.ceil(TAU * r * 1.3);

  for (let i = 0; i < count; i++) {
    const at = (i / count) * TAU;
    const cos = Math.cos(at);
    const sin = Math.sin(at);
    // Teeth: every other stretch of the rim stands two pixels proud.
    const tooth = Math.floor(((at - angle) / TAU) * teeth * 2 + 1000) % 2 === 0;

    // Lit from the upper left.
    const color =
      cos + sin < -0.5 ? BRASS_LIGHT : cos + sin > 0.9 ? BRASS_DARK : BRASS;

    plot(dim, x + cos * r, y + sin * r, color, a);
    plot(dim, x + cos * (r - 1), y + sin * (r - 1), BRASS_DARK, a);

    if (tooth) {
      plot(dim, x + cos * (r + 1), y + sin * (r + 1), color, a);
      plot(dim, x + cos * (r + 2), y + sin * (r + 2), color, a);
    }
  }

  if (r > 4)
    for (let spoke = 0; spoke < 4; spoke++) {
      const at = angle + (spoke / 4) * TAU;
      pixelLine(
        dim,
        x,
        y,
        x + Math.cos(at) * (r - 2),
        y + Math.sin(at) * (r - 2),
        BRASS,
        a,
        a,
      );
    }

  plot(dim, x, y, BRASS_LIGHT, a);
  plot(b.lit(), x - 1, y - 1, BRASS_LIGHT, 0.5 * a);
}

/** The gears behind the shoulders, hung on the spring so they trail a walk. */
export function drawGears(b: Brush, place: AuraPlacement, clock: number): void {
  const { bounds } = place.silhouette;
  const a = b.intensity;
  const turn = (Math.floor(clock * NOTCHES) / NOTCHES) * 0.9;
  const cx = place.x + bounds.x + bounds.w / 2 + b.lag.x;
  const top = place.y + bounds.y + b.lag.y;
  const bigX = Math.round(cx + bounds.w / 2 + 7);
  const bigY = Math.round(top + bounds.h * 0.22);
  drawGear(b, bigX, bigY, 9, 10, turn, a);
  // A small one meshed with it, turning the other way.
  drawGear(
    b,
    Math.round(bigX + Math.cos(-0.9) * 15),
    Math.round(bigY + Math.sin(-0.9) * 15),
    4,
    5,
    -turn * 2 + 0.3,
    a,
  );
  drawGear(
    b,
    Math.round(cx - bounds.w / 2 - 8),
    Math.round(top + bounds.h * 0.5),
    6,
    7,
    -turn * 1.4,
    a,
  );
}

// --- the echoes ---------------------------------------------------------------------------------

/** Where the character stood at one of the last ticks, on the map. */
export interface TrailStep {
  x: number;
  y: number;
  silhouette: AuraSilhouette;
}

/** How many ticks of the walk an aura keeps, newest first. */
export const TRAIL_STEPS = 7;

/** Further than a walk can leave an echo, px: the character was moved, not walking. */
const ECHO_REACH = 140;

/** Which ticks back the echoes stand, and how strong each is. */
const ECHOES = [
  [2, 0.4],
  [4, 0.26],
  [6, 0.14],
] as const;

/**
 * The character's echoes where it stood a moment ago, straight onto the map behind it:
 * one blit of its tinted shape each. While time stands still (`still`, 0..1) two more
 * part from it sideways, so a standing character shows them too.
 */
export function drawTimeEchoes(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  trail: readonly TrailStep[],
  color: Rgb,
  intensity: number,
  still: number,
): void {
  const { pad } = place.silhouette;
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = false;

  for (const [back, alpha] of ECHOES) {
    const step = trail[back];

    if (!step) continue;
    const x = Math.round(step.x - place.viewX);
    const y = Math.round(step.y - place.viewY);

    const away = Math.hypot(x - place.x, y - place.y);

    // Standing still, the echoes are all behind the character; after a teleport there are none.
    if (away < 2 || away > ECHO_REACH) continue;
    const image = tintedSilhouette(step.silhouette, color);

    if (!image) continue;
    ctx.globalAlpha = alpha * intensity;
    ctx.drawImage(image, x - pad, y - pad);
  }

  if (still <= 0.02) return;
  const image = tintedSilhouette(place.silhouette, color);

  if (!image) return;

  for (const [side, alpha] of [
    [-1, 0.34],
    [1, 0.34],
    [-2, 0.16],
    [2, 0.16],
  ] as const) {
    ctx.globalAlpha = alpha * still * intensity;
    ctx.drawImage(
      image,
      Math.round(place.x + side * (3 + still * 5)) - pad,
      Math.round(place.y) - pad,
    );
  }
}

// --- time standing still over the map -----------------------------------------------------------

const GREY: Rgb = [128, 128, 128];

/**
 * The stop over the whole map: its colour drains away, a dial as wide as the screen
 * opens round the character with its hand running backwards, and a wave rolls out when
 * time snaps back. Nothing is drawn between bursts.
 */
export function drawTimeStop(scene: MapScene): void {
  const { ctx, width, height, burst, x, feetY, light, mid } = scene;

  if (burst < 0) return;
  const still = stillness(burst);

  if (still > 0) {
    // A grey source keeps the map's light and hue but takes its saturation.
    // The one who stopped time keeps their colour.
    washAround(scene, GREY, 0.92 * still, 36, 90, "saturation");
    wash(scene, mid, 0.07 * still, "lighter");

    const open = smoothstep(STOP_FROM, STOP_FROM + 0.12, burst);
    const radius = Math.min(width, height) * 0.46 * (0.2 + 0.8 * open);
    const squash = 0.55;

    const turn =
      -Math.floor(((burst - STOP_FROM) * TIMESTOP_LENGTH) / 0.3) * (TAU / 12);

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(light, 1);
    ctx.lineCap = "butt";

    ctx.globalAlpha = 0.5 * still;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, feetY, radius, radius * squash, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.25 * still;
    ctx.beginPath();
    ctx.ellipse(x, feetY, radius * 0.9, radius * 0.9 * squash, 0, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = 0.6 * still;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      const from = i % 3 === 0 ? 0.78 : 0.86;
      ctx.moveTo(
        x + Math.cos(angle) * radius * from,
        feetY + Math.sin(angle) * radius * squash * from,
      );
      ctx.lineTo(
        x + Math.cos(angle) * radius * 0.97,
        feetY + Math.sin(angle) * radius * squash * 0.97,
      );
    }

    ctx.moveTo(x, feetY);
    ctx.lineTo(
      x + Math.cos(turn - Math.PI / 2) * radius * 0.84,
      feetY + Math.sin(turn - Math.PI / 2) * radius * squash * 0.84,
    );
    ctx.stroke();
  }

  if (burst < STOP_TO) return;
  const release = (burst - STOP_TO) / (1 - STOP_TO);
  wash(scene, light, 0.22 * (1 - release) ** 3, "lighter");
  groundWave(
    scene,
    release * Math.max(width, height) * 0.6,
    light,
    mid,
    (1 - release) ** 1.5,
  );
}

// --- the tooltip --------------------------------------------------------------------------------

/** A small clock standing on the middle of the top edge, its hand ticking round. */
export function drawTipClock({ b, L, T, W, light, mid, a }: TipFrame): void {
  const lit = b.lit();
  const cx = Math.round(L + W / 2);
  const cy = T - 8;
  const r = 6;
  pixelEllipse(lit, cx, cy, r, r, BRASS_LIGHT, a, 0, 1);
  pixelEllipse(lit, cx, cy, r + 1, r + 1, BRASS_DARK, 0.7 * a, 0, 1);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * TAU;
    plot(
      lit,
      cx + Math.cos(angle) * (r - 2),
      cy + Math.sin(angle) * (r - 2),
      BRASS,
      a,
    );
  }

  const long = (Math.floor(b.time) / HAND_TURN) * TAU - Math.PI / 2;
  const short = (b.time / (HAND_TURN * 12)) * TAU + 0.6;
  pixelLine(
    lit,
    cx,
    cy,
    cx + Math.cos(short) * 2.5,
    cy + Math.sin(short) * 2.5,
    mid,
    a,
    a,
  );
  pixelLine(
    lit,
    cx,
    cy,
    cx + Math.cos(long) * 4,
    cy + Math.sin(long) * 4,
    light,
    a,
    a,
  );
}

/** A gear turning half behind the bottom right corner. */
export function drawTipGear({ b, R, B, a }: TipFrame): void {
  drawGear(
    b,
    R + 2,
    B + 2,
    7,
    8,
    (Math.floor(b.time * NOTCHES) / NOTCHES) * 0.9,
    a,
  );
}
