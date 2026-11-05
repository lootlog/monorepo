import { envelope, ramp, rgba, type Rgb } from "./math";
import type { Particle, ParticleKind } from "./particles";
import {
  DIAG,
  LEAF_POSES,
  ORTHO,
  drawDot,
  hot,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  pixelPlus,
  plot,
} from "./paint";

/** Draws one particle kind at (`x`, `y`); `age` runs 0..1 over its life. */
type ParticlePainter = (
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
  tick: number,
) => void;

function drawMoteParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a =
    envelope(age, 0.15, 0.5) *
    ((tick + Math.floor(p.seed)) % 6 === 0 ? 0.55 : 1);

  if (p.size < 1.2) plot(lit, x, y, color, a);
  else pixelPlus(lit, x, y, hot(color), color, a, p.size > 1.6);
}

function drawEmberParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  _color: Rgb,
  palette: Rgb[],
): void {
  const heat = ramp(palette.slice(0, 4), age);
  const a = envelope(age, 0.08, 0.5);
  pixelLine(lit, x, y, x - p.vx * 0.08, y - p.vy * 0.08, heat, a, a * 0.2);

  if (p.size > 2.4) pixelPlus(lit, x, y, hot(heat), heat, a, false);
  else plot(lit, x, y, hot(heat), a);
}

function drawSparkParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.05, 0.6);
  pixelLine(lit, x, y, x - p.vx * 0.06, y - p.vy * 0.06, color, a, a * 0.15);
  plot(lit, x, y, [255, 255, 255], a);
}

function drawGlintParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  pixelGlint(
    lit,
    x,
    y,
    Math.round(p.size * 0.5 * Math.sin(Math.PI * age)),
    [255, 255, 255],
    color,
    1,
  );
}

function drawFlakeParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.35);

  // Snow that landed lies as a pixel or two.
  if (p.settled) {
    plot(lit, x, y, [255, 255, 255], a * 0.9);

    if (p.size > 3) plot(lit, x + 1, y, color, a * 0.6);

    return;
  }

  // A 5×5 pixel snowflake; arms and diagonals swap every few ticks to twinkle.
  const big = p.size >= 2.8;
  const turn = (tick + Math.floor(p.seed)) % 8 < 4;
  plot(lit, x, y, [255, 255, 255], a);

  for (const [dx, dy] of turn ? ORTHO : DIAG) {
    plot(lit, x + dx, y + dy, color, a * 0.9);

    if (big) plot(lit, x + dx * 2, y + dy * 2, color, a * 0.6);
  }

  if (big)
    for (const [dx, dy] of turn ? DIAG : ORTHO)
      plot(lit, x + dx, y + dy, color, a * 0.4);
}

function drawBubbleParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.2, 0.1);
  const r = Math.max(1, Math.round(p.size * (0.8 + age * 0.4)));
  pixelEllipse(lit, x, y, r, r, color, a * 0.9, 0, 1);
  plot(lit, x - Math.ceil(r / 2), y - Math.ceil(r / 2), [255, 255, 255], a);
}

function drawLeafParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.3);

  // Three poses stepping through a flutter.
  const pose =
    LEAF_POSES[
      p.settled ? 0 : (tick + Math.floor(p.seed)) % LEAF_POSES.length
    ] ?? [];

  const dark: Rgb = [
    Math.round(color[0] * 0.55),
    Math.round(color[1] * 0.55),
    Math.round(color[2] * 0.55),
  ];

  for (const [dx, dy, shade] of pose)
    plot(dim, x + dx, y + dy, shade ? dark : color, a);
}

function drawShardParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.1, 0.4);
  const len = Math.max(1, Math.round(p.size * 0.8));
  const vertical = Math.sin(p.rot) > 0;

  for (let i = -len; i <= len; i++)
    plot(
      lit,
      x + (vertical ? 0 : i),
      y + (vertical ? i : 0),
      i < 0 ? [255, 255, 255] : color,
      a,
    );
  plot(lit, x + (vertical ? 1 : 0), y + (vertical ? 0 : 1), color, a * 0.7);
  plot(lit, x - (vertical ? 1 : 0), y - (vertical ? 0 : 1), color, a * 0.7);
}

function drawSmokeParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  drawDot(
    dim,
    x,
    y,
    p.size * (2 + age * 2.5),
    color,
    0.3 * envelope(age, 0.25, 0.6),
  );
}

function drawWispParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.3, 0.25);
  drawDot(dim, x, y, p.size * 3.5, color, a * 0.7);
  plot(lit, x, y, palette[0] ?? color, a * 0.8);
}

function drawFireflyParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const on = Math.sin(p.age * 2.4 + p.seed) > -0.2;
  const a = envelope(age, 0.1, 0.2) * (on ? 1 : 0.15);
  drawDot(lit, x, y, p.size * 6, color, a * 0.5);
  pixelPlus(lit, x, y, [255, 255, 220], color, a, false);
}

function drawDropParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const a = envelope(age, 0.1, 0.1);
  // Fast drops streak: the faster, the longer the trail above them.
  const streak = Math.min(4, Math.round(Math.abs(p.vy) / 40));

  for (let k = streak; k >= 1; k--)
    plot(lit, x, y - k, color, a * (1 - k / (streak + 1)));
  plot(lit, x, y, hot(color), a);
  plot(lit, x, y + 1, color, a * 0.7);
}

function drawFeatherParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.1, 0.3);
  // Four pixels on a slant that rocks with the swing; flat once it lies.
  const lean = p.settled ? 0 : p.rot > 0.3 ? 1 : p.rot < -0.3 ? -1 : 0;

  for (let i = -1; i <= 2; i++)
    plot(
      dim,
      x + i,
      y - (lean ? Math.round((i * lean) / 2) : 0),
      i === 2 ? [255, 255, 255] : color,
      a,
    );
  plot(dim, x, y + 1, palette[1] ?? color, a * 0.6);
}

function drawGrainParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.05, 0.3);
  plot(dim, x, y, color, a);

  // Bigger grains are 2×2 stones with a lit top edge.
  if (p.size > 1.5) {
    plot(dim, x + 1, y, color, a);
    plot(dim, x, y + 1, STONE_SHADE, a);
    plot(dim, x + 1, y + 1, STONE_SHADE, a);
    plot(lit, x, y - 1, palette[1] ?? color, a * 0.4);
  }
}

function drawRockParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = envelope(age, 0.1, 0.2);
  dim.fillStyle = rgba([24, 10, 34], a);
  dim.fillRect(x, y, 2, 2);
  plot(lit, x + (p.vx > 0 ? 0 : 1), y, palette[0] ?? color, a * 0.8);
}

function drawBatParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  _color: Rgb,
  _palette: Rgb[],
  tick: number,
): void {
  const a = envelope(age, 0.15, 0.15);
  // Two-frame flap: wings up, then down.
  const up = (tick + Math.floor(p.seed)) % 2 === 0;
  const body: Rgb = [36, 6, 12];
  const wing: Rgb = [110, 16, 28];
  plot(dim, x, y, body, a);
  plot(dim, x, y + 1, body, a);

  for (const side of [-1, 1]) {
    plot(dim, x + side, y + (up ? -1 : 0), wing, a);
    plot(dim, x + side * 2, y + (up ? -2 : 1), wing, a);
    plot(dim, x + side * 3, y + (up ? -2 : 1), wing, a * 0.8);
    // Moonlight catching the wing tips.
    plot(lit, x + side * 3, y + (up ? -3 : 1), [255, 70, 70], a * 0.7);
  }

  plot(lit, x, y, [255, 200, 120], a);
}

function drawDustParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  plot(lit, x, y, color, envelope(age, 0.2, 0.4) * (p.settled ? 0.7 : 1));
}

function drawScorchParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  _p: Particle,
  x: number,
  y: number,
  age: number,
): void {
  // A landed ember: glows orange, cools through red to a dark mark, then fades.
  const heat = ramp(
    [
      [255, 200, 90],
      [230, 70, 20],
      [90, 20, 10],
      [30, 18, 14],
    ],
    age,
  );

  const a = age > 0.7 ? (1 - age) / 0.3 : 1;
  plot(age < 0.6 ? lit : dim, x, y, heat, a);
  plot(age < 0.6 ? lit : dim, x + 1, y, heat, a * 0.7);

  if (age < 0.3) plot(lit, x, y - 1, [255, 230, 160], a * 0.6);
}

function drawPuddleParticle(
  lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
  tick: number,
): void {
  // A flat pool swelling as drops feed it and drying from the edges; a glint on top.
  const dry = age > 0.6 ? (1 - age) / 0.4 : 1;
  const r = Math.max(1, Math.round(p.size * dry));

  for (let dx = -r; dx <= r; dx++)
    plot(
      dim,
      x + dx,
      y,
      Math.abs(dx) === r ? (palette[3] ?? color) : color,
      0.85,
    );

  if (r > 1)
    for (let dx = -r + 1; dx < r; dx++)
      plot(dim, x + dx, y + 1, palette[3] ?? color, 0.7);

  if ((tick + Math.floor(p.seed)) % 12 < 2)
    plot(lit, x - Math.floor(r / 2), y, [255, 255, 255], 0.8);
}

function drawPrintParticle(
  _lit: CanvasRenderingContext2D,
  dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
  palette: Rgb[],
): void {
  const a = (1 - age) * 0.6;
  plot(dim, x, y, palette[2] ?? color, a);
  plot(dim, x + p.rot, y, palette[2] ?? color, a * 0.7);
}

function drawRingParticle(
  lit: CanvasRenderingContext2D,
  _dim: CanvasRenderingContext2D,
  p: Particle,
  x: number,
  y: number,
  age: number,
  color: Rgb,
): void {
  const grow = 1 - (1 - age) * (1 - age);
  const r = Math.max(1, Math.round(p.size * (0.3 + grow * 0.9)));
  pixelEllipse(
    lit,
    x,
    y,
    r,
    Math.max(1, Math.round(r * p.squash)),
    color,
    (1 - age) * 0.95,
    0,
    1,
  );
}

/** Particles drawn on the covering layer: opaque things that hide what is under them. */
export const COVERING_PARTICLES: ReadonlySet<ParticleKind> =
  new Set<ParticleKind>([
    "leaf",
    "smoke",
    "wisp",
    "feather",
    "grain",
    "rock",
    "bat",
    "puddle",
    "print",
    "scorch",
  ]);

/** Particles drawn with soft gradients, so their layers need the pixel finish. */
export const SOFT_PARTICLES: ReadonlySet<ParticleKind> = new Set<ParticleKind>([
  "smoke",
  "wisp",
  "firefly",
]);

/** The shaded underside of a 2×2 stone grain. */
const STONE_SHADE: Rgb = [18, 14, 16];

export const PARTICLE_PAINTERS: Record<ParticleKind, ParticlePainter> = {
  mote: drawMoteParticle,
  ember: drawEmberParticle,
  spark: drawSparkParticle,
  glint: drawGlintParticle,
  flake: drawFlakeParticle,
  bubble: drawBubbleParticle,
  leaf: drawLeafParticle,
  shard: drawShardParticle,
  smoke: drawSmokeParticle,
  wisp: drawWispParticle,
  firefly: drawFireflyParticle,
  drop: drawDropParticle,
  feather: drawFeatherParticle,
  grain: drawGrainParticle,
  rock: drawRockParticle,
  bat: drawBatParticle,
  dust: drawDustParticle,
  scorch: drawScorchParticle,
  puddle: drawPuddleParticle,
  print: drawPrintParticle,
  ring: drawRingParticle,
};
