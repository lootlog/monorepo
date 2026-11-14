/**
 * Złoty wojownik: a tall flame of golden energy standing round the character, lightning
 * crawling over it, the ground cracked under its feet. While the admin is on the map the
 * air streams away from them in lines across the whole screen, pebbles lift off the
 * ground everywhere and a pulse rolls out every second or so. Its burst is a power-up:
 * everything is drawn in towards the character, then released at once, and the map shakes.
 */
import { clamp } from "es-toolkit";
import { mulberry32, noise1, rgba, type Rgb } from "./math";
import { pixelLine, plot } from "./paint";
import type { Brush } from "./decor";
import type { AuraPlacement } from "./placement";
import { groundWave, scatter, wash, washAround, type MapScene } from "./sky";

const WHITE: Rgb = [255, 255, 255];

/** The power gathers until this fraction of the burst, then is released. */
export const POWER_RELEASE = 0.45;

/** How much taller than at rest the flame stands, at `burst` (0..1, -1 resting). */
function surge(burst: number): number {
  if (burst < 0) return 0;

  // Drawn in while the power gathers, then thrown up and settling.
  if (burst < POWER_RELEASE) return -0.25 * (burst / POWER_RELEASE);

  return (1 - (burst - POWER_RELEASE) / (1 - POWER_RELEASE)) ** 1.5 * 0.9;
}

/**
 * The flame of energy round the character: a bright wavering edge, a thin dithered veil
 * inside it and streaks racing up through it. The shell goes behind the character
 * (`front` false); only the veil and the streaks pass before it.
 */
export function drawPowerFlame(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  burst: number,
): void {
  const { bounds } = place.silhouette;
  const [light, mid, dark] = b.tones;
  const lit = b.lit();
  const a = b.intensity;
  const grow = 1 + surge(burst);
  const cx = place.x + bounds.x + bounds.w / 2;
  const base = Math.round(place.feetY) + 2;
  const tall = Math.round((bounds.h + 24) * grow);
  const half = (bounds.w / 2 + 13) * (1 + surge(burst) * 0.4);
  // The flame flickers faster while the power gathers.
  const t = b.time * (burst >= 0 && burst < POWER_RELEASE ? 14 : 8);

  for (let row = 0; row <= tall; row++) {
    const up = row / tall;
    const y = base - row;

    // Widest at the knees, drawn to a point that leans as it flickers.
    const width =
      half * (1 - up ** 1.8) * (0.55 + 0.45 * Math.min(1, row / 8)) +
      noise1(t + row * 0.22, 3) * (1 + up * 3) +
      // Tongues of flame: the edge steps out and in as they climb.
      ((row + Math.floor(t)) % 7 < 3 ? 2 : -1) * (0.4 + up);

    if (width < 0.5) continue;
    const lean = noise1(t * 0.6 + row * 0.08, 9) * up * up * 6;
    const left = Math.round(cx + lean - width);
    const right = Math.round(cx + lean + width);

    if (!front) {
      for (const [edge, inward] of [
        [left, 1],
        [right, -1],
      ] as const) {
        plot(lit, edge, y, up > 0.8 ? WHITE : light, a);
        plot(lit, edge + inward, y, mid, 0.85 * a);
        plot(lit, edge + inward * 2, y, dark, 0.5 * a);

        // A loose spark of the edge now and then.
        if ((row * 7 + b.tick * 3) % 23 === 0)
          plot(lit, edge - inward * 2, y - 1, light, 0.8 * a);
      }
    }

    // The veil: every other pixel, so the map and the character show through.
    const veil = (front ? 0.1 : 0.22) * (1 - up * 0.6) * a;

    for (let x = left + 3; x <= right - 3; x++)
      if ((x + y + b.tick) % 2 === 0) plot(lit, x, y, mid, veil);
  }

  // Streaks racing up through the flame.
  for (let i = 0; i < 7; i++) {
    if ((i % 2 === 0) !== front) continue;
    const rise = ((b.time * (1.6 + (i % 3) * 0.5) + i * 0.37) % 1) * tall;
    const x = cx + ((i / 6) * 2 - 1) * half * 0.7 * (1 - (rise / tall) ** 2);
    pixelLine(lit, x, base - rise, x, base - rise - 5, light, 0.9 * a, 0.1 * a);
  }
}

// --- the field of power over the map ------------------------------------------------------------

/** How much the field dims the map, 0..1, so its gold reads. */
export const POWER_GLOOM = 0.26;

export const POWER_VEIL: Rgb = [10, 7, 0];

const STREAMS = 46;

/** Seconds between the pulses rolling out from the character, and how far they reach, px. */
const PULSE_EVERY = 1.4;

const PULSE_REACH = 260;

/** How hard the map shakes at the release, px. */
const SHAKE = 9;

/** Lines of air streaming away from the character, or into it while the power gathers. */
const streams = (() => {
  const rng = mulberry32(9001);

  return Array.from({ length: STREAMS }, () => ({
    angle: rng() * Math.PI * 2,
    phase: rng(),
    speed: 0.5 + rng() * 0.6,
    length: 18 + rng() * 40,
  }));
})();

/** Moves everything drawn so far by a few pixels: the map shaking under the release. */
function shake({ ctx, time }: MapScene, strength: number): void {
  const rng = mulberry32(Math.round(time * 10) * 131 + 5);
  const dx = Math.round((rng() - 0.5) * 2 * SHAKE * strength);
  const dy = Math.round((rng() - 0.5) * 2 * SHAKE * strength);

  if (dx === 0 && dy === 0) return;
  ctx.save();
  // In the canvas's own pixels, whatever the game's zoom.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "copy";
  ctx.globalAlpha = 1;
  ctx.drawImage(ctx.canvas, dx, dy);
  ctx.restore();
}

/**
 * The field over the whole map: the dark that makes the gold read, air streaming away
 * from the character, pebbles lifting off the ground and a pulse rolling out again and
 * again. In a burst the air is drawn in, then a flash, three shockwaves and the shake.
 */
export function drawPowerField(scene: MapScene): void {
  const { ctx, width, height, x, y, now, view, burst, light, mid } = scene;
  const gathering = burst >= 0 && burst < POWER_RELEASE;

  const release =
    burst >= POWER_RELEASE ? (burst - POWER_RELEASE) / (1 - POWER_RELEASE) : -1;

  if (release >= 0 && release < 0.5) shake(scene, 1 - release * 2);

  washAround(scene, POWER_VEIL, POWER_GLOOM, 60, 190);

  // Pebbles lifting off the ground all over the map, faster while the power gathers.
  ctx.globalCompositeOperation = "source-over";
  const lift = now * (gathering ? 60 : 22);

  scatter(view[0], view[1] + lift, width, height, 84, 97, (px, py, p, q) => {
    const size = q > 0.7 ? 3 : 2;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#3a3028";
    ctx.fillRect(
      Math.round(px + Math.sin(now * 2 + p * 30) * 2),
      Math.round(py),
      size,
      size,
    );
    ctx.fillStyle = "#9a8a70";
    ctx.fillRect(
      Math.round(px + Math.sin(now * 2 + p * 30) * 2),
      Math.round(py),
      size,
      1,
    );
  });

  // The air streaming out in lines, bright ones far out; inwards while gathering.
  const reach = Math.hypot(width, height) * 0.55;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "butt";
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(light, 1);

  for (const dim of [true, false]) {
    ctx.globalAlpha = (dim ? 0.16 : 0.42) * (gathering ? 1.8 : 1);
    ctx.beginPath();

    for (const [i, stream] of streams.entries()) {
      if ((i % 3 === 0) === dim) continue;

      const along =
        (now * stream.speed * (gathering ? -2.2 : 1) + stream.phase) % 1;

      const from = 46 + (along < 0 ? along + 1 : along) * reach;
      const cos = Math.cos(stream.angle);
      const sin = Math.sin(stream.angle) * 0.62;
      ctx.moveTo(x + cos * from, y + sin * from);
      ctx.lineTo(
        x + cos * (from + stream.length),
        y + sin * (from + stream.length),
      );
    }

    ctx.stroke();
  }

  // The pulse: a ring rolling out from the feet, again and again.
  const pulse = (now % PULSE_EVERY) / PULSE_EVERY;
  groundWave(
    scene,
    pulse * PULSE_REACH,
    light,
    mid,
    clamp(1 - pulse, 0, 1) ** 2 * 0.6,
  );

  if (release < 0) return;
  wash(scene, light, 0.5 * (1 - release) ** 3, "lighter");

  for (const delay of [0, 0.14, 0.28]) {
    const wave = (release - delay) / (1 - delay);

    if (wave > 0)
      groundWave(
        scene,
        wave * Math.max(width, height) * 0.8,
        WHITE,
        light,
        (1 - wave) ** 1.4,
      );
  }
}
