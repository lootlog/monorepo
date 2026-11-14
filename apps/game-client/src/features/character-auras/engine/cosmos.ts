/**
 * Kosmos: a spiral galaxy turning under the feet, two planets on their orbits round the
 * body and, while the admin is on the map, night over all of it: stars that stay on the
 * map, nebulae and meteors. Its burst is a supernova: the galaxy falls into the
 * character, then blows out in a shell of light whose shockwave rolls over the map.
 */
import { clamp } from "es-toolkit";
import { mulberry32, rgba, smoothstep, TAU, type Rgb } from "./math";
import { pixelDisc, pixelEllipse, pixelGlint, pixelLine, plot } from "./paint";
import type { Brush, TipFrame } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import { context2d, createCanvas } from "./silhouette";
import {
  groundWave,
  scatter,
  wash,
  washAround,
  wrap,
  type MapScene,
} from "./sky";

const WHITE: Rgb = [255, 255, 255];

/** When the collapse ends and the star blows, as a fraction of the burst. */
export const SUPERNOVA_BLAST = 0.4;

/** How far the galaxy has fallen into the character, 0..1, `burst` (0..1, -1 resting) in. */
function collapseAt(burst: number): number {
  if (burst < 0) return 0;

  if (burst < SUPERNOVA_BLAST) return smoothstep(0, SUPERNOVA_BLAST, burst);

  // Blown back out fast, past its size and settling.
  const u = (burst - SUPERNOVA_BLAST) / (1 - SUPERNOVA_BLAST);

  return 1 - smoothstep(0, 0.35, u) - Math.sin(u * Math.PI) * 0.12;
}

// --- the galaxy ---------------------------------------------------------------------------------

interface GalaxyStar {
  /** Distance from the core, 0..1, and the angle it starts at. */
  r: number;
  angle: number;
  color: number;
  bright: number;
  /** Ticks between its twinkles, and which tick of them. */
  beat: number;
  phase: number;
}

const GALAXY_STARS = 230;

/** Core to rim: warm white, pale blue, violet, with pink knots of young stars. */
const GALAXY_COLORS: readonly Rgb[] = [
  [255, 238, 176],
  [130, 160, 255],
  [176, 96, 255],
  [255, 96, 204],
];

const galaxy: readonly GalaxyStar[] = (() => {
  const rng = mulberry32(90210);
  const stars: GalaxyStar[] = [];

  for (let i = 0; i < GALAXY_STARS; i++) {
    // Two arms, denser towards the core; a few stars strewn between them.
    const stray = rng() < 0.14;
    const r = 0.1 + 0.9 * rng() ** 0.8;
    const arm = Math.floor(rng() * 2) * Math.PI;
    const scatterAngle = (rng() - 0.5) * (stray ? TAU : 0.34 * (1.2 - r));

    stars.push({
      r,
      angle: arm + r * 4.4 + scatterAngle,
      color: rng() < 0.12 ? 3 : r < 0.3 ? 0 : r < 0.65 ? 1 : 2,
      bright: 0.6 + rng() * 0.4,
      beat: 9 + Math.floor(rng() * 14),
      phase: Math.floor(rng() * 20),
    });
  }

  return stars;
})();

/** The galaxy on the ground under the feet; the inner stars turn faster than the rim. */
export function drawGalaxy(
  b: Brush,
  place: AuraPlacement,
  burst: number,
): void {
  const lit = b.lit();
  const a = b.intensity;
  const size = 1 - collapseAt(burst) * 0.88;
  const rx = groundRadius(place) * 2.3 * size;
  const ry = rx * 0.38;
  const cx = Math.round(place.feetX);
  const cy = Math.round(place.feetY) - 2;

  // The core: a small bright bulge, drawn in pixels so the stars round it stay crisp.
  const coreX = Math.max(2, Math.round(rx * 0.14));
  const coreY = Math.max(1, Math.round(ry * 0.2));

  for (let dy = -coreY; dy <= coreY; dy++) {
    const half = Math.round(coreX * Math.sqrt(1 - (dy / (coreY + 0.5)) ** 2));

    for (let dx = -half; dx <= half; dx++)
      plot(lit, cx + dx, cy + dy, GALAXY_COLORS[0] ?? WHITE, a);
  }

  for (const star of galaxy) {
    const angle = star.angle - (b.time * 0.5) / (0.3 + star.r);
    const x = cx + Math.cos(angle) * star.r * rx;
    const y = cy + Math.sin(angle) * star.r * ry;
    const twinkle = (b.tick + star.phase) % star.beat === 0;
    const color = GALAXY_COLORS[star.color] ?? WHITE;

    if (twinkle && star.bright > 0.8) pixelGlint(lit, x, y, 1, WHITE, color, a);
    else plot(lit, x, y, twinkle ? WHITE : color, star.bright * a);

    // The brightest stars are two pixels wide.
    if (star.bright > 0.93) plot(lit, x + 1, y, color, 0.8 * a);
  }

  plot(lit, cx, cy, WHITE, a);
  plot(lit, cx - 1, cy, WHITE, 0.8 * a);
  plot(lit, cx + 1, cy, WHITE, 0.8 * a);
}

// --- the planets --------------------------------------------------------------------------------

interface Planet {
  /** Height on the body, 0 at the head, and the orbit's size beyond half the body's width. */
  at: number;
  reach: number;
  speed: number;
  tilt: number;
  radius: number;
  body: Rgb;
  shade: Rgb;
  ring?: Rgb;
}

const PLANETS: readonly Planet[] = [
  {
    at: 0.34,
    reach: 17,
    speed: 0.85,
    tilt: -0.2,
    radius: 3,
    body: [232, 186, 112],
    shade: [150, 96, 58],
    ring: [255, 232, 180],
  },
  {
    at: 0.72,
    reach: 11,
    speed: -1.35,
    tilt: 0.16,
    radius: 2,
    body: [96, 170, 255],
    shade: [38, 76, 170],
  },
];

/**
 * The planets on their orbits: the far half of an orbit (`front` false) goes behind the
 * character. The supernova pulls them in with the galaxy.
 */
export function drawPlanets(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  burst: number,
): void {
  const { bounds } = place.silhouette;
  const a = b.intensity;
  const cx = place.x + bounds.x + bounds.w / 2;
  const pull = 1 - collapseAt(burst) * 0.55;

  for (const [index, planet] of PLANETS.entries()) {
    const rx = (bounds.w / 2 + planet.reach) * pull;
    const ry = rx * 0.3;
    const cy = place.y + bounds.y + bounds.h * planet.at;
    const angle = b.time * planet.speed + index * 2.6;

    // The orbit itself, a dotted line.
    for (let i = 0; i < 28; i++) {
      const dot = (i / 28) * TAU;

      if (Math.sin(dot) > 0 !== front) continue;
      const ox = Math.cos(dot) * rx;
      plot(
        b.lit(),
        cx + ox,
        cy + Math.sin(dot) * ry + ox * planet.tilt,
        b.tones[1],
        0.4 * a,
      );
    }

    if (Math.sin(angle) > 0 !== front) continue;
    const ox = Math.cos(angle) * rx;
    const x = Math.round(cx + ox);
    const y = Math.round(cy + Math.sin(angle) * ry + ox * planet.tilt);
    drawPlanet(b, x, y, planet, a);
  }
}

/** A planet lit from the upper left, with its ring across it when it has one. */
function drawPlanet(
  b: Brush,
  x: number,
  y: number,
  planet: Planet,
  a: number,
): void {
  const dim = b.dim();
  const lit = b.lit();
  const r = planet.radius;

  // The far half of the ring first, so the planet covers it.
  if (planet.ring)
    for (let dx = -r - 3; dx <= r + 3; dx++)
      if (Math.abs(dx) > r)
        plot(dim, x + dx, y - Math.sign(dx), planet.ring, 0.9 * a);

  dim.fillStyle = rgba(planet.shade, a);
  pixelDisc(dim, x, y, r);
  dim.fillStyle = rgba(planet.body, a);
  pixelDisc(dim, x - 1, y - 1, r - 1);
  plot(lit, x - 1, y - r + 1, WHITE, 0.7 * a);

  if (planet.ring)
    for (let dx = -r - 1; dx <= r + 1; dx++)
      plot(dim, x + dx, y + 1, planet.ring, a);
}

// --- the supernova ------------------------------------------------------------------------------

/**
 * The blast after the collapse, round the chest: a shell of light blowing out, a slower
 * one behind it and a four-pointed flare over the character that shrinks as it cools.
 */
export function drawSupernova(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  burst: number,
): void {
  if (burst < 0) return;
  const { bounds } = place.silhouette;
  const [light, mid, dark] = b.tones;
  const a = b.intensity;
  const cx = Math.round(place.x + bounds.x + bounds.w / 2);
  const cy = Math.round(place.y + bounds.y + bounds.h * 0.45);
  const lit = b.lit();

  if (burst < SUPERNOVA_BLAST) {
    // Light gathering at the chest as everything falls in.
    if (!front) return;
    const k = burst / SUPERNOVA_BLAST;
    const r = (1 - k) * 26 + 3;
    pixelEllipse(lit, cx, cy, r, r * 0.9, mid, k * a, 0, 2);
    pixelGlint(lit, cx, cy, Math.round(1 + k * 3), WHITE, light, k * a);

    return;
  }

  const u = (burst - SUPERNOVA_BLAST) / (1 - SUPERNOVA_BLAST);
  const fade = (1 - u) ** 1.5 * a;
  const reach = Math.max(bounds.w, bounds.h) * 0.5 + 40;

  if (!front) {
    const shell = 6 + (1 - (1 - u) ** 2) * reach;
    pixelEllipse(lit, cx, cy, shell, shell * 0.85, light, fade, 0, 1);
    pixelEllipse(
      lit,
      cx,
      cy,
      shell * 0.7,
      shell * 0.6,
      GALAXY_COLORS[3] ?? mid,
      fade * 0.7,
      0,
      2,
    );
    pixelEllipse(
      lit,
      cx,
      cy,
      shell * 0.45,
      shell * 0.38,
      dark,
      fade * 0.6,
      0,
      2,
    );

    return;
  }

  const arm = (1 - u) ** 2 * reach;

  if (arm < 2) return;

  for (const [dx, dy, length] of [
    [1, 0, arm],
    [-1, 0, arm],
    [0, 1, arm * 0.6],
    [0, -1, arm * 0.6],
  ] as const)
    pixelLine(
      lit,
      cx,
      cy,
      cx + dx * length,
      cy + dy * length,
      light,
      fade,
      0.02,
    );
  pixelGlint(lit, cx, cy, 3, WHITE, light, fade);
}

// --- the night over the map ---------------------------------------------------------------------

/** How much the night darkens the map, 0..1. */
export const COSMOS_GLOOM = 0.62;

const NIGHT: Rgb = [5, 6, 26];

const NEBULA_W = 320;

const NEBULA_H = 170;

const NEBULA_COLORS: readonly Rgb[] = [
  [120, 50, 220],
  [30, 120, 220],
  [220, 50, 150],
];

/** Seconds between chances of a meteor, how long one flies and how far, px. */
const METEOR_EVERY = 1.9;

const METEOR_LENGTH = 0.7;

const METEOR_RUN = 320;

const nebulae: HTMLCanvasElement[] = [];

function nebula(index: number): HTMLCanvasElement {
  const cached = nebulae[index];

  if (cached) return cached;
  const canvas = createCanvas(NEBULA_W, NEBULA_H);
  const ctx = context2d(canvas);
  const color = NEBULA_COLORS[index % NEBULA_COLORS.length] ?? NIGHT;
  ctx.translate(NEBULA_W / 2, NEBULA_H / 2);
  ctx.scale(1, NEBULA_H / NEBULA_W);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, NEBULA_W / 2);
  gradient.addColorStop(0, rgba(color, 0.9));
  gradient.addColorStop(0.5, rgba(color, 0.35));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(-NEBULA_W / 2, -NEBULA_W / 2, NEBULA_W, NEBULA_W);
  nebulae[index] = canvas;

  return canvas;
}

/** Star rects gathered per colour, so a frame sets each fill style once: x, y, size, alpha. */
const starRuns: number[][] = [[], [], []];

const STAR_COLORS = ["#ffffff", "#bcd0ff", "#ffe6b8"] as const;

function gatherStars(
  scene: MapScene,
  cell: number,
  seed: number,
  depth: number,
  big: boolean,
  flare: number,
): void {
  const { width, height, view, now } = scene;

  scatter(
    view[0] * depth,
    view[1] * depth,
    width,
    height,
    cell,
    seed,
    (x, y, p, q) => {
      const twinkle = 0.6 + 0.4 * Math.sin(now * (1 + p * 2.5) + q * 40);
      const alpha = Math.min(1, (0.45 + q * 0.55) * twinkle + flare);
      const run = starRuns[p < 0.7 ? 0 : p < 0.88 ? 1 : 2];
      run?.push(Math.round(x), Math.round(y), big && q > 0.7 ? 2 : 1, alpha);
    },
  );
}

/**
 * Night over the whole map: the dark, nebulae and two depths of stars that slide slower
 * than the map as the camera moves, a meteor every couple of seconds and, when the aura
 * bursts, the supernova's flash and shockwave.
 */
export function drawCosmosSky(scene: MapScene): void {
  const { ctx, width, height, now, view, burst } = scene;

  // The whole sky flares up with the blast.
  const blast =
    burst >= SUPERNOVA_BLAST
      ? (burst - SUPERNOVA_BLAST) / (1 - SUPERNOVA_BLAST)
      : -1;

  const flare = blast >= 0 ? (1 - blast) ** 3 : 0;

  washAround(scene, NIGHT, COSMOS_GLOOM, 50, 170);

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + flare * 0.2;

  for (let i = 0; i < 4; i++) {
    const x = wrap(i * 437 + now * 4 - view[0] * 0.5, width + NEBULA_W * 2);
    const y = wrap(i * 263 - view[1] * 0.5, height + NEBULA_H * 2);
    ctx.drawImage(nebula(i), x - NEBULA_W, y - NEBULA_H);
  }

  for (const run of starRuns) run.length = 0;
  gatherStars(scene, 34, 11, 0.35, false, flare * 0.5);
  gatherStars(scene, 62, 23, 0.7, true, flare * 0.5);

  for (const [index, run] of starRuns.entries()) {
    ctx.fillStyle = STAR_COLORS[index] ?? STAR_COLORS[0];

    for (let i = 0; i < run.length; i += 4) {
      const x = run[i] ?? 0;
      const y = run[i + 1] ?? 0;
      ctx.globalAlpha = run[i + 3] ?? 0;

      if (run[i + 2] === 1) ctx.fillRect(x, y, 1, 1);
      else {
        // A bright star: a small cross.
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
  }

  drawMeteors(scene, blast);

  if (blast < 0) return;
  wash(scene, scene.light, 0.3 * (1 - blast) ** 4, "lighter");
  groundWave(
    scene,
    blast * Math.max(width, height) * 0.7,
    scene.light,
    scene.mid,
    (1 - blast) ** 1.5,
  );
}

/** A meteor in most slots of time, and a shower of them right after a supernova. */
function drawMeteors(scene: MapScene, blast: number): void {
  const { now } = scene;
  const slot = Math.floor(now / METEOR_EVERY);
  const rng = mulberry32(slot * 7919 + 5);

  if (rng() < 0.75) {
    const k =
      (now - slot * METEOR_EVERY - rng() * (METEOR_EVERY - METEOR_LENGTH)) /
      METEOR_LENGTH;

    drawMeteor(scene, rng(), rng(), k);
  }

  if (blast < 0) return;
  const shower = mulberry32(977);

  for (let i = 0; i < 5; i++)
    drawMeteor(scene, shower(), shower(), blast * 1.6 - i * 0.12);
}

/** One meteor `k` (0..1) along its fall towards the lower left, from a spot `u`, `v` picks. */
function drawMeteor(scene: MapScene, u: number, v: number, k: number): void {
  if (k <= 0 || k >= 1) return;
  const { ctx, width, height, light, mid } = scene;
  const x = width * (0.15 + u * 0.95) - k * METEOR_RUN;
  const y = height * (v * 0.55) - 20 + k * METEOR_RUN * 0.55;
  const fade = Math.sin(Math.PI * k);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // The tail in three pieces, thinner and fainter away from the head.
  for (const [from, to, lineWidth, alpha, color] of [
    [0, 14, 2, 1, light],
    [14, 40, 1.5, 0.55, mid],
    [40, 78, 1, 0.22, mid],
  ] as const) {
    ctx.globalAlpha = alpha * fade;
    ctx.strokeStyle = rgba(color, 1);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x + from, y - from * 0.55);
    ctx.lineTo(x + to, y - to * 0.55);
    ctx.stroke();
  }

  ctx.globalAlpha = fade;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
}

// --- the tooltip --------------------------------------------------------------------------------

/** Stars twinkling round the frame, behind it. */
export function drawTipStars({ b, L, T, W, H, light, mid, a }: TipFrame): void {
  const rng = mulberry32(4242);

  for (let i = 0; i < 22; i++) {
    // Along the frame's sides, a few px outside it.
    const side = Math.floor(rng() * 4);
    const along = rng();
    const out = 3 + rng() * 9;
    const x = side < 2 ? L + along * W : side === 2 ? L - out : L + W + out;
    const y = side === 0 ? T - out : side === 1 ? T + H + out : T + along * H;
    const beat = (b.tick + i * 5) % 17;

    if (beat < 2) pixelGlint(b.lit(), x, y, 1, WHITE, light, a);
    else plot(b.lit(), x, y, i % 3 ? light : mid, (0.5 + rng() * 0.5) * a);
  }
}

/** A ringed planet sitting on the top left corner and a small galaxy on the bottom right. */
export function drawTipPlanet({
  b,
  L,
  T,
  R,
  B,
  light,
  mid,
  a,
}: TipFrame): void {
  const planet = PLANETS[0];

  if (planet) drawPlanet(b, L - 2, T - 3, planet, a);

  for (let i = 0; i < 26; i++) {
    const r = (i % 13) / 13;
    const angle = (i < 13 ? 0 : Math.PI) + r * 4.4 - b.time * 0.8;
    plot(
      b.lit(),
      R + 3 + Math.cos(angle) * r * 8,
      B + 3 + Math.sin(angle) * r * 4,
      r < 0.4 ? light : mid,
      clamp(1.1 - r, 0.3, 1) * a,
    );
  }

  plot(b.lit(), R + 3, B + 3, WHITE, a);
}
