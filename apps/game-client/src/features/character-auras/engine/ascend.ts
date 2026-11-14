/**
 * Złoty wojownik: a solid, spiked fire of golden energy burning behind the character,
 * more than twice its height, the ground cracked under its feet. While the admin is on the map the
 * air streams away from them in lines across the whole screen, pebbles lift off the
 * ground everywhere and a pulse rolls out every second or so. Its burst is a power-up:
 * everything is drawn in towards the character, then released at once, and the map shakes.
 */
import { clamp } from "es-toolkit";
import { mulberry32, rgba, type Rgb } from "./math";
import { pixelLine } from "./paint";
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

/** How one of the warrior auras' fires looks. */
export interface PowerFire {
  /** Its size against the first one's. */
  scale: number;
  /** Spikes round it, from the ground on one side over the top to the other. */
  spikes: number;
  /** Its colours, outside in: the faint bloom, the edge, the body and the white-hot core. */
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  /** The glow of the lightning crawling over it, when it has any. */
  bolt?: Rgb;
}

/**
 * The fire's shells, outside in: how far each reaches, how long its spikes are and how
 * solid it is. The outermost is a faint bloom; the rest are opaque.
 */
const SHELLS = [
  { reach: 1.1, spike: 1.15, alpha: 0.3 },
  { reach: 1, spike: 1, alpha: 1 },
  { reach: 0.86, spike: 0.74, alpha: 1 },
  { reach: 0.68, spike: 0.42, alpha: 1 },
] as const;

/**
 * The fire behind the character, as anime draws it: one solid shape more than twice the
 * character's height, white-hot at the body and gold at its edge, whose whole outline is
 * sharp spikes swept upwards, a new set every tick. Drawn straight onto the map, so it
 * is not held to the aura's own buffers round the character.
 */
export function drawPowerFire(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  tick: number,
  burst: number,
  intensity: number,
  fire: PowerFire,
): void {
  const { bounds } = place.silhouette;
  const { spikes } = fire;
  const grow = 1 + surge(burst);
  const cx = place.x + bounds.x + bounds.w / 2;
  const base = Math.round(place.feetY) + 3;
  const rx = (bounds.w * 0.95 + 10) * fire.scale * (1 + surge(burst) * 0.5);
  const ry = bounds.h * 1.05 * fire.scale * grow;
  const cy = base - ry * 0.82;
  // From just under the left flank, over the top, to just under the right one.
  const from = Math.PI - 0.6;
  const sweep = Math.PI + 1.2;
  const rng = mulberry32(tick * 7919 + 13);
  // One set of spikes for every shell, so the shells stay nested.
  const lengths = Array.from({ length: spikes }, () => 0.5 + rng() * 0.8);
  const leans = Array.from({ length: spikes }, () => (rng() - 0.5) * 0.6);
  ctx.globalCompositeOperation = "source-over";

  for (const [index, shell] of SHELLS.entries()) {
    ctx.globalAlpha = Math.min(1, shell.alpha * intensity);
    ctx.fillStyle = rgba(fire.colors[index] ?? fire.colors[3], 1);
    ctx.beginPath();
    ctx.moveTo(cx - rx * shell.reach * 0.75, base);

    for (let i = 0; i < spikes; i++) {
      const angle = from + ((i + 0.5) / spikes) * sweep;
      const half = (sweep / spikes) * 0.5;
      // How near the top the spike is: those there are the longest.
      const top = Math.max(0, -Math.sin(angle));

      const length =
        (12 + 34 * top) * (lengths[i] ?? 1) * shell.spike * fire.scale * grow;

      // Every spike is swept upwards, as fire is, not straight out.
      const outX = Math.cos(angle) + (leans[i] ?? 0);
      const outY = Math.sin(angle) - 1.2;
      const norm = Math.hypot(outX, outY) || 1;

      ctx.lineTo(
        cx + Math.cos(angle - half) * rx * shell.reach,
        Math.min(base, cy + Math.sin(angle - half) * ry * shell.reach),
      );
      ctx.lineTo(
        cx + Math.cos(angle) * rx * shell.reach + (outX / norm) * length,
        cy + Math.sin(angle) * ry * shell.reach + (outY / norm) * length,
      );
    }

    ctx.lineTo(cx + rx * shell.reach * 0.75, base);
    ctx.closePath();
    ctx.fill();
  }
}

/** Thin streaks racing up through the fire, before the character. */
export function drawPowerStreaks(
  b: Brush,
  place: AuraPlacement,
  burst: number,
): void {
  const { bounds } = place.silhouette;
  const a = b.intensity;
  const cx = place.x + bounds.x + bounds.w / 2;
  const base = Math.round(place.feetY) + 2;
  const tall = (bounds.h + 40) * (1 + surge(burst));

  for (let i = 0; i < 5; i++) {
    const rise = ((b.time * (1.8 + i * 0.4) + i * 0.37) % 1) * tall;
    const x = cx + ((i / 4) * 2 - 1) * (bounds.w / 2 + 8);
    pixelLine(
      b.lit(),
      x,
      base - rise,
      x,
      base - rise - 7,
      WHITE,
      0.9 * a,
      0.1 * a,
    );
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
