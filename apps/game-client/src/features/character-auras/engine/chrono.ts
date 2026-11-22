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
import { wash, washAround, type MapScene } from "./sky";
import { tintedSilhouette } from "./summon";
import { hasGraphicsAcceleration } from "../map-aura-mode";

const WHITE: Rgb = [255, 255, 255];

const BRASS_LIGHT: Rgb = [255, 226, 150];

const BRASS: Rgb = [214, 160, 70];

const BRASS_DARK: Rgb = [116, 76, 26];

export const STOP_FROM = 0.12;

export const STOP_TO = 0.85;

export const TIMESTOP_LENGTH = 2.6;

export function stillness(burst: number): number {
  if (burst < 0) return 0;

  return (
    smoothstep(STOP_FROM, STOP_FROM + 0.04, burst) *
    (1 - smoothstep(STOP_TO - 0.04, STOP_TO, burst))
  );
}

const HAND_TURN = 12;

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

  const whole = Math.floor(clock);
  const kick = clock - whole < 0.15 ? 0.2 : 0;

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

const NOTCHES = 5;

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
    const tooth = Math.floor(((at - angle) / TAU) * teeth * 2 + 1000) % 2 === 0;

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

export function drawGears(b: Brush, place: AuraPlacement, clock: number): void {
  const { bounds } = place.silhouette;
  const a = b.intensity;
  const turn = (Math.floor(clock * NOTCHES) / NOTCHES) * 0.9;
  const cx = place.x + bounds.x + bounds.w / 2 + b.lag.x;
  const top = place.y + bounds.y + b.lag.y;
  const bigX = Math.round(cx + bounds.w / 2 + 7);
  const bigY = Math.round(top + bounds.h * 0.22);
  drawGear(b, bigX, bigY, 9, 10, turn, a);
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

export interface TrailStep {
  x: number;
  y: number;
  silhouette: AuraSilhouette;
}

export const TRAIL_STEPS = 7;

const ECHO_REACH = 140;

const ECHOES = [
  [2, 0.4],
  [4, 0.26],
  [6, 0.14],
] as const;

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

const GREY: Rgb = [128, 128, 128];

export function drawTimeStop(scene: MapScene): void {
  const { ctx, width, height, burst, x, feetY, light, mid } = scene;

  if (burst < 0) return;
  const still = stillness(burst);

  if (still > 0) {
    if (hasGraphicsAcceleration())
      washAround(scene, GREY, 0.92 * still, 36, 90, "saturation");
    else washAround(scene, GREY, 0.6 * still, 36, 90);
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
}

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
