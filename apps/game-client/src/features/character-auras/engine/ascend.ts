import { mulberry32, rgba, type Rgb } from "./math";
import { jagged, pixelLine } from "./paint";
import type { Brush } from "./decor";
import type { AuraPlacement } from "./placement";
import { scatter, wash, washAround, type MapScene } from "./sky";

const WHITE: Rgb = [255, 255, 255];

export const POWER_RELEASE = 0.45;

function surge(burst: number): number {
  if (burst < 0) return 0;

  if (burst < POWER_RELEASE) return -0.25 * (burst / POWER_RELEASE);

  return (1 - (burst - POWER_RELEASE) / (1 - POWER_RELEASE)) ** 1.5 * 0.9;
}

export interface PowerFire {
  scale: number;
  spikes: number;
  colors: readonly [Rgb, Rgb, Rgb, Rgb];
  bolt?: Rgb;
}

const SHELLS = [
  { reach: 1.1, spike: 1.15, alpha: 0.3 },
  { reach: 1, spike: 1, alpha: 1 },
  { reach: 0.86, spike: 0.74, alpha: 1 },
  { reach: 0.68, spike: 0.42, alpha: 1 },
] as const;

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
  const from = Math.PI - 0.6;
  const sweep = Math.PI + 1.2;
  const rng = mulberry32(tick * 7919 + 13);
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
      const top = Math.max(0, -Math.sin(angle));

      const length =
        (12 + 34 * top) * (lengths[i] ?? 1) * shell.spike * fire.scale * grow;

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

export const POWER_GLOOM = 0.26;

export const POWER_VEIL: Rgb = [10, 7, 0];

const STREAMS = 46;

const SHAKE = 9;

const CRACKS = 9;

const CRACK_REACH = 340;

function drawCracks(scene: MapScene, release: number): void {
  const { ctx, x, feetY, light } = scene;
  const rng = mulberry32(4711);
  const grown = Math.min(1, release * 3.5);
  const cool = 1 - release;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < CRACKS; i++) {
    const angle = (i / CRACKS) * Math.PI * 2 + rng() * 0.5;
    const reach = CRACK_REACH * (0.55 + rng() * 0.45);

    const path = jagged(
      x,
      feetY,
      x + Math.cos(angle) * reach,
      feetY + Math.sin(angle) * reach * 0.55,
      rng,
    );

    const count = Math.max(2, Math.round((path.length / 2) * grown));

    for (const [color, lineWidth, alpha, mode] of [
      ["#120a04", 5, 0.8, "source-over"],
      [rgba(light, 1), 2, cool, "lighter"],
    ] as const) {
      ctx.globalCompositeOperation = mode;
      ctx.globalAlpha = alpha * Math.min(1, cool * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(path[0] ?? x, path[1] ?? feetY);

      for (let k = 1; k < count; k++)
        ctx.lineTo(path[k * 2] ?? x, path[k * 2 + 1] ?? feetY);
      ctx.stroke();
    }
  }
}

const streams = (() => {
  const rng = mulberry32(9001);

  return Array.from({ length: STREAMS }, () => ({
    angle: rng() * Math.PI * 2,
    phase: rng(),
    speed: 0.5 + rng() * 0.6,
    length: 18 + rng() * 40,
  }));
})();

function shake({ ctx, time }: MapScene, strength: number): void {
  const rng = mulberry32(Math.round(time * 10) * 131 + 5);
  const dx = Math.round((rng() - 0.5) * 2 * SHAKE * strength);
  const dy = Math.round((rng() - 0.5) * 2 * SHAKE * strength);

  if (dx === 0 && dy === 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "copy";
  ctx.globalAlpha = 1;
  ctx.drawImage(ctx.canvas, dx, dy);
  ctx.restore();
}

export function drawPowerField(scene: MapScene): void {
  const { ctx, width, height, x, y, now, view, burst, light } = scene;
  const gathering = burst >= 0 && burst < POWER_RELEASE;

  const release =
    burst >= POWER_RELEASE ? (burst - POWER_RELEASE) / (1 - POWER_RELEASE) : -1;

  if (release >= 0 && release < 0.5) shake(scene, 1 - release * 2);

  washAround(scene, POWER_VEIL, POWER_GLOOM, 60, 190);

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

  if (release < 0) return;
  wash(scene, light, 0.5 * (1 - release) ** 3, "lighter");

  drawCracks(scene, release);
}
