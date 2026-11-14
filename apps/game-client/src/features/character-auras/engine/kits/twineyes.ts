/**
 * Dwoje oczu: nothing spreads out from this aura; what it has comes down to it. Two great
 * eyes hang in the sky over the map, one red with three marks turning in it, one violet
 * and ringed, and lightning plays over the character's hand. Its burst is the catch: the
 * eyes open wide, a bolt falls from the top of the screen and the character catches it in
 * a raised hand, holds it crackling there, and takes it in.
 */
import { mulberry32, rgba, TAU, type Rgb, type Rng } from "../math";
import { jagged, pixelGlint, pixelLine, plot } from "../paint";
import { groundRadius } from "../placement";
import { wash } from "../sky";
import { span, type AuraKit } from "./kit";

const WHITE: Rgb = [255, 255, 255];

const VOLT: Rgb = [150, 200, 255];

const DEEP: Rgb = [90, 80, 230];

const RED: Rgb = [200, 16, 30];

const VIOLET: Rgb = [164, 136, 232];

const INK: Rgb = [10, 4, 12];

const DARK: Rgb = [8, 4, 16];

/** The burst: the eyes open, the bolt falls, it is held, it is taken in. */
const FALL_FROM = 0.22;

const CAUGHT = 0.36;

const HELD_UNTIL = 0.82;

/** How far the hand is raised for the catch, 0..1, at `burst` (0..1, -1 resting). */
function raised(burst: number): number {
  if (burst < 0) return 0;

  return span(burst, 0.1, FALL_FROM) * (1 - span(burst, HELD_UNTIL, 1));
}

/** The hand: at the side when lowered, beside the head when `lift` is 1. */
function hand(
  x: number,
  top: number,
  half: number,
  tall: number,
  lift: number,
): [number, number] {
  return [x + half + 3 + lift * 2, top + tall * (0.52 - lift * 0.4)];
}

/** Strokes a jagged bolt along `points` up to `share` of its length, glow under core. */
function strokeBolt(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  share: number,
  alpha: number,
  thick: number,
): void {
  const count = Math.max(2, Math.round((points.length / 2) * share));

  for (const [color, lineWidth, a] of [
    [DEEP, 9 * thick, 0.25],
    [VOLT, 4 * thick, 0.6],
    [WHITE, 1.5 * thick, 1],
  ] as const) {
    ctx.globalAlpha = Math.min(1, a * alpha);
    ctx.strokeStyle = rgba(color, 1);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0] ?? 0, points[1] ?? 0);

    for (let i = 1; i < count; i++)
      ctx.lineTo(points[i * 2] ?? 0, points[i * 2 + 1] ?? 0);
    ctx.stroke();
  }
}

/** Short arcs crackling out of (`x`, `y`) and dying within `reach` px: nothing rolls on. */
function crackle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  reach: number,
  count: number,
  alpha: number,
  rng: Rng,
): void {
  for (let i = 0; i < count; i++) {
    const angle = rng() * TAU;
    const length = reach * (0.4 + rng() * 0.6);
    strokeBolt(
      ctx,
      jagged(
        x,
        y,
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length,
        rng,
      ),
      1,
      alpha,
      0.45,
    );
  }
}

/** An iris in the sky at (`x`, `y`), `open` (0..1) wide: its disc, rim and pupil. */
function iris(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  open: number,
  color: Rgb,
): void {
  ctx.fillStyle = rgba(color, 1);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * open, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 1);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = rgba(INK, 1);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.2, r * 0.2 * open, 0, 0, TAU);
  ctx.fill();
}

/** The two eyes over the map, `open` wide and `alpha` strong; the marks turn by `turn`. */
function drawEyes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  open: number,
  alpha: number,
  turn: number,
): void {
  const r = Math.min(64, width * 0.09);
  const y = height * 0.17;
  const left = width * 0.36;
  const right = width * 0.64;
  ctx.globalCompositeOperation = "source-over";

  // A glow behind each, then the irises.
  for (const [x, color] of [
    [left, RED],
    [right, VIOLET],
  ] as const) {
    ctx.globalAlpha = 0.18 * alpha;
    ctx.fillStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.5, r * 1.5 * open, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    iris(ctx, x, y, r, open, color);
  }

  // The red one: three marks chasing each other round the pupil, each a drop with a tail.
  ctx.fillStyle = rgba(INK, 1);
  ctx.strokeStyle = rgba(INK, 1);
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = "round";

  for (let i = 0; i < 3; i++) {
    const angle = turn + (i / 3) * TAU;
    const mx = left + Math.cos(angle) * r * 0.58;
    const my = y + Math.sin(angle) * r * 0.58 * open;
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 0.13, r * 0.13 * open, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(left, y, r * 0.58, r * 0.58 * open, 0, angle - 0.55, angle);
    ctx.stroke();
  }

  // The violet one: rings within rings.
  ctx.lineWidth = 2.5;

  for (const ring of [0.42, 0.62, 0.82]) {
    ctx.beginPath();
    ctx.ellipse(right, y, r * ring, r * ring * open, 0, 0, TAU);
    ctx.stroke();
  }
}

export const twineyes: AuraKit = {
  gloom: 0.3,
  veil: DARK,
  burst: { length: 3.2, release: CAUGHT },

  pieces(b, place, front, burst) {
    const { bounds, edge } = place.silhouette;
    const a = b.intensity;
    const cx = place.x + bounds.x + bounds.w / 2;
    const top = place.y + bounds.y;

    if (!front) {
      // Three marks turning on the ground under the feet: turning, never spreading.
      const rx = groundRadius(place);
      const fx = Math.round(place.feetX);
      const fy = Math.round(place.feetY) - 2;

      for (let i = 0; i < 3; i++) {
        const angle = b.time * 1.6 + (i / 3) * TAU;

        for (let k = 0; k < 7; k++) {
          const at = angle - k * 0.13;
          plot(
            b.lit(),
            fx + Math.cos(at) * rx * 0.8,
            fy + Math.sin(at) * rx * 0.8 * 0.38,
            k < 2 ? WHITE : RED,
            (1 - k / 8) * a,
          );
        }
      }

      return;
    }

    const lift = raised(burst);
    const [hx, hy] = hand(cx, top, bounds.w / 2, bounds.h, lift);
    const rng = mulberry32(b.tick * 7919 + 3);
    const held = burst >= CAUGHT && burst < HELD_UNTIL;

    // Lightning over the hand: a few sparks at rest, a ball of it once the bolt is caught.
    for (let i = 0; i < (held ? 9 : 3); i++) {
      const angle = rng() * TAU;
      const length = (held ? 6 : 3) + rng() * (held ? 9 : 5);
      pixelLine(
        b.lit(),
        hx,
        hy,
        hx + Math.cos(angle) * length,
        hy + Math.sin(angle) * length,
        rng() < 0.5 ? WHITE : VOLT,
        a,
        0.3 * a,
      );
    }

    pixelGlint(b.lit(), hx, hy, held ? 4 : 1, WHITE, VOLT, a);

    if (burst < HELD_UNTIL) return;

    // Taken in: it runs over the outline of the body and is gone.
    for (let i = 0; i < 26; i++) {
      const site = edge[Math.floor(rng() * edge.length)];

      if (site)
        plot(
          b.lit(),
          place.x + site.x + site.nx,
          place.y + site.y + site.ny,
          rng() < 0.5 ? WHITE : VOLT,
          (1 - span(burst, HELD_UNTIL, 1)) * a,
        );
    }
  },

  sky(scene) {
    const { ctx, width, height, now, time, burst, x, top, half, feetY } = scene;
    const active = burst >= 0;
    // The eyes drowse between bursts and stare for the whole of one.
    const stare = active ? span(burst, 0, 0.12) * (1 - span(burst, 0.9, 1)) : 0;
    const blink = now % 5.3 < 0.14 ? 0.15 : 1;
    wash(scene, DARK, 0.3 + stare * 0.3);
    drawEyes(
      ctx,
      width,
      height,
      (0.42 + stare * 0.58) * (active ? 1 : blink),
      0.4 + stare * 0.6,
      now * (0.5 + stare * 5),
    );

    if (!active || burst < FALL_FROM) return;
    const [hx, hy] = hand(x, top, half, feetY - top, raised(burst));
    const rng = mulberry32(Math.round(time * 10) * 131 + 17);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (burst < CAUGHT + 0.08) {
      // The bolt on its way down: its tip falls from the sky into the hand, then lingers.
      const fall = span(burst, FALL_FROM, CAUGHT) ** 2;
      const linger = 1 - span(burst, CAUGHT, CAUGHT + 0.08);
      const path = jagged(hx + (rng() - 0.5) * 120, -20, hx, hy, rng);
      strokeBolt(ctx, path, fall, linger, 1);

      // Forks off its upper half, dying in the air.
      for (let i = 0; i < 3; i++) {
        const from = Math.floor(rng() * (path.length / 4)) * 2;

        if (from / path.length > fall) continue;
        const fx = path[from] ?? hx;
        const fy = path[from + 1] ?? 0;
        strokeBolt(
          ctx,
          jagged(fx, fy, fx + (rng() - 0.5) * 160, fy + 40 + rng() * 70, rng),
          1,
          linger * 0.7,
          0.5,
        );
      }

      wash(
        scene,
        VOLT,
        0.3 * (burst >= CAUGHT ? linger : fall * 0.3),
        "lighter",
      );
    }

    if (burst < CAUGHT) return;
    // Held: it crackles round the hand and goes nowhere, fading as it is taken in.
    const hold = 1 - span(burst, HELD_UNTIL, 1);
    crackle(ctx, hx, hy, 58, 6, hold, rng);
    ctx.globalAlpha = 0.5 * hold;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx, hy, 7 + rng() * 3, 0, TAU);
    ctx.fill();
  },
};
