import { clamp } from "es-toolkit";
import { TAU, mulberry32, noise1, rgba, type Rgb } from "./math";
import {
  pixelArc,
  pixelDisc,
  pixelEllipse,
  pixelGlint,
  pixelLine,
  plot,
  softEllipse,
} from "./paint";
import type { Brush } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";

/** Astral orbits: height on the body, angular speed, tilt and palette colour. */
const ORBITS = [
  { at: 0.3, speed: 1.7, tilt: -0.22, color: 0 },
  { at: 0.58, speed: -1.25, tilt: 0.16, color: 3 },
  { at: 0.86, speed: 2.1, tilt: -0.08, color: 2 },
];

/** Divine: 1 px rays turning a notch per tick, alternately long and short, fading outwards. */
export function drawRays(b: Brush, place: AuraPlacement): void {
  const intensity = b.intensity;
  const { bounds } = place.silhouette;
  const cx = place.x + bounds.x + bounds.w / 2;
  const cy = place.y + bounds.y + bounds.h * 0.38;
  const reach = Math.max(bounds.w, bounds.h) * 0.5;
  const [light, mid] = b.tones;
  const count = 16;
  const turn = b.time * 0.25;

  for (let i = 0; i < count; i++) {
    const angle = turn + (i / count) * TAU;
    const long = i % 2 === 0;
    const flicker = 0.75 + 0.25 * noise1(b.time * 0.9 + i * 3.3, 21);
    const from = reach * 0.6;
    const to = reach + (long ? 16 : 8) * flicker;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const a = (long ? 0.7 : 0.45) * intensity * flicker;
    pixelLine(
      b.lit(),
      cx + cos * from,
      cy + sin * from,
      cx + cos * to,
      cy + sin * to,
      long ? light : mid,
      a,
      0.05,
    );
  }
}

/** Blood moon: a dark red pixel disc with craters and a lit rim, behind the head. */
export function drawMoon(b: Brush, place: AuraPlacement, beat: number): void {
  const intensity = b.intensity;
  const { head, bounds } = place.silhouette;

  const r = Math.round(
    clamp(bounds.w * 0.38, 7, 12) * (place.ground ? 1 : 0.9),
  );

  // Characters: rising behind the head, off to one side so it isn't hidden by it.
  const lag = place.ground ? b.lag : { x: 0, y: 0 };

  const x = Math.round(
    place.x + head.x + (place.ground ? r * 0.75 : 0) + lag.x * 1.3,
  );

  const y = Math.round(
    place.y + head.y + (place.ground ? r * 0.15 : 0) + lag.y,
  );

  softEllipse(
    b.lit(),
    x,
    y,
    r * 2.2,
    r * 2.2,
    [200, 20, 30],
    0.35 * intensity * beat,
  );
  const dim = b.dim();
  dim.fillStyle = rgba([110, 8, 16], 0.97 * intensity);
  pixelDisc(dim, x, y, r);
  dim.fillStyle = rgba([150, 18, 26], 0.97 * intensity);
  pixelDisc(dim, x - 1, y - 1, r - 2);
  dim.fillStyle = rgba([70, 0, 8], 0.9 * intensity);

  for (const [cx, cy, cr] of [
    [-0.35, -0.15, 0.24],
    [0.3, 0.35, 0.18],
    [0.35, -0.4, 0.12],
  ] as const) {
    pixelDisc(
      dim,
      x + Math.round(cx * r),
      y + Math.round(cy * r),
      Math.max(1, Math.round(cr * r)),
    );
  }

  pixelEllipse(
    b.lit(),
    x,
    y,
    r,
    r,
    [255, 70, 60],
    0.9 * intensity * clamp(beat, 0.6, 1.2),
    0,
    1,
  );
}

/**
 * Eclipse: a black sun behind the head, its corona of short flickering rays and a bright
 * "diamond ring" glint running round its rim.
 */
export function drawEclipse(
  b: Brush,
  place: AuraPlacement,
  beat: number,
): void {
  const intensity = b.intensity;
  const { head, bounds } = place.silhouette;
  const [light, mid] = b.tones;
  const r = Math.round(clamp(bounds.w * 0.5, 9, 14) * (place.ground ? 1 : 0.9));
  // Characters: risen above and behind the head, so the head hides only its lower edge.
  const lag = place.ground ? b.lag : { x: 0, y: 0 };
  const x = Math.round(place.x + head.x + lag.x * 1.3);

  const y = Math.round(
    place.y + head.y - (place.ground ? r * 0.55 : 0) + lag.y,
  );

  softEllipse(b.lit(), x, y, r * 2.4, r * 2.4, mid, 0.3 * intensity * beat);

  // The corona: rays of uneven length, turning slowly.
  const lit = b.lit();
  const count = 20;
  const turn = b.time * 0.12;

  for (let i = 0; i < count; i++) {
    const angle = turn + (i / count) * TAU;
    const flicker = 0.6 + 0.4 * noise1(b.time * 1.4 + i * 2.7, 31);
    const to = r + 2 + (i % 2 === 0 ? 7 : 4) * flicker;
    pixelLine(
      lit,
      x + Math.cos(angle) * (r + 1),
      y + Math.sin(angle) * (r + 1),
      x + Math.cos(angle) * to,
      y + Math.sin(angle) * to,
      i % 2 === 0 ? light : mid,
      0.75 * intensity * flicker * beat,
      0.05,
    );
  }

  const dim = b.dim();
  dim.fillStyle = rgba([6, 4, 8], 0.98 * intensity);
  pixelDisc(dim, x, y, r);
  pixelEllipse(lit, x, y, r, r, light, 0.95 * intensity, 0, 1);

  const ring = b.time * 0.7;
  pixelGlint(
    lit,
    Math.round(x + Math.cos(ring) * r),
    Math.round(y + Math.sin(ring) * r),
    2,
    [255, 255, 255],
    light,
    intensity,
  );
}

/** Hellfire: flame tongues licking up from the outline, each on its own flicker. */
export function drawTongues(
  b: Brush,
  place: AuraPlacement,
  eruption: number,
): void {
  const intensity = b.intensity;
  const edge = place.silhouette.edge;

  if (!edge.length) return;
  const count = place.ground ? 14 : 22;
  // An eruption doubles the flames for a moment.
  const base = (place.ground ? 6 : 5) * (1 + eruption);
  const ctx = b.lit();

  for (let i = 0; i < count; i++) {
    const site = edge[Math.floor(((i + 0.5) / count) * edge.length)];

    // Flames rise from the top and the flanks, never from under the feet.
    if (!site || site.ny > 0.5) continue;
    const t = b.time * 2.6 + i * 1.7;

    const height =
      base + noise1(t, i) * 2.5 + (0.5 + 0.5 * noise1(t * 2.1, i + 90)) * 4;

    const width = 1.6 + 0.6 * (0.5 + 0.5 * noise1(t * 0.8, i + 40));
    const x = place.x + site.x + site.nx * 1.5;
    const y = place.y + site.y + site.ny * 1.5 + 1;
    const tipX = x + noise1(t * 1.4, i + 70) * 2.6 + site.nx * 2;
    const tipY = y - height;
    const gradient = ctx.createLinearGradient(x, y, tipX, tipY);
    gradient.addColorStop(0, "rgba(255,244,190,0.95)");
    gradient.addColorStop(0.3, "rgba(255,170,50,0.85)");
    gradient.addColorStop(0.7, "rgba(230,50,12,0.5)");
    gradient.addColorStop(1, "rgba(120,10,0,0)");
    ctx.globalAlpha = 0.85 * Math.min(1, intensity);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.quadraticCurveTo(x - width, y - height * 0.55, tipX, tipY);
    ctx.quadraticCurveTo(x + width, y - height * 0.55, x + width, y);
    ctx.quadraticCurveTo(x, y + width, x - width, y);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/** Screen positions of the orbiting stars' heads, the attractors of the star dust. */
export function orbitHeads(
  place: AuraPlacement,
  time: number,
): [number, number][] {
  const { bounds } = place.silhouette;
  const cx = place.x + bounds.x + bounds.w / 2;

  const rx = place.ground ? clamp(bounds.w * 0.75, 15, 26) : bounds.w / 2 + 12;

  const ry = place.ground ? rx * 0.3 : bounds.h * 0.18;

  return ORBITS.flatMap((orbit, index) => {
    if (!place.ground && index === 1) return [];

    const cy =
      place.y +
      bounds.y +
      bounds.h * (place.ground ? orbit.at : index ? 0.75 : 0.25);

    const angle = time * orbit.speed + index * 2.1;
    const ox = Math.cos(angle) * rx;

    const head: [number, number] = [
      cx + ox,
      cy + Math.sin(angle) * ry + ox * orbit.tilt,
    ];

    return [head];
  });
}

/** Astral: three stars with pixel tails on tilted orbits, split by depth around the body. */
export function drawOrbits(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  rim: Rgb,
): void {
  const intensity = b.intensity;
  const { bounds } = place.silhouette;
  const cx = place.x + bounds.x + bounds.w / 2;
  const orbits = ORBITS;

  const rx = place.ground ? clamp(bounds.w * 0.75, 15, 26) : bounds.w / 2 + 12;

  const ry = place.ground ? rx * 0.3 : bounds.h * 0.18;

  for (const [index, orbit] of orbits.entries()) {
    if (!place.ground && index === 1) continue;

    const cy =
      place.y +
      bounds.y +
      bounds.h * (place.ground ? orbit.at : index ? 0.75 : 0.25);

    const color = b.palette[orbit.color] ?? rim;
    const head = b.time * orbit.speed + index * 2.1;
    const tail = 9;

    for (let k = tail; k >= 0; k--) {
      const angle = head - Math.sign(orbit.speed) * k * 0.11;
      const ox = Math.cos(angle) * rx;
      const depth = Math.sin(angle);

      if (depth > 0 !== front) continue;
      const x = cx + ox;
      const y = cy + depth * ry + ox * orbit.tilt;

      if (k === 0)
        pixelGlint(b.lit(), x, y, 2, [255, 255, 255], color, intensity);
      else plot(b.lit(), x, y, color, (1 - k / tail) * 0.9 * intensity);
    }
  }
}

/**
 * Halo: a thin silver ring over the head, the half behind the head (`front` false) or before
 * it, one pixel higher while `raised`. Pixels only, so a lite aura can cache it.
 */
export function drawHalo(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  raised: boolean,
): void {
  const { head, bounds } = place.silhouette;
  const [light, mid] = b.tones;
  const rx = Math.round(clamp(bounds.w * 0.3, 5, 9));
  const ry = Math.max(2, Math.round(rx * 0.32));
  const x = Math.round(place.x + head.x);
  const y = Math.round(place.y + head.y) - 4 - (raised ? 1 : 0);
  const a = b.intensity;
  pixelArc(b.lit(), x, y, rx, ry, light, 0.9 * a, front);
  pixelArc(b.lit(), x, y - 1, rx, ry, mid, 0.45 * a, front);
}

/** Dragon: segments of its serpentine body, head first, and their spacing in radians. */
const DRAGON_SEGMENTS = 11;

const DRAGON_GAP = 0.15;

/** Lite steps the dragon takes per turn round the character. */
const DRAGON_TURN = 30;

/**
 * Fire dragon: a small dragon circling the character at waist height, the far side of the
 * circle (`front` false) behind it. `step` is the aura's lite step; pixels only.
 */
export function drawFireDragon(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  step: number,
): void {
  const { bounds } = place.silhouette;
  const [light, mid, dark] = b.tones;
  const cx = place.x + bounds.x + bounds.w / 2;
  const cy = place.y + bounds.y + bounds.h * 0.55;
  const rx = Math.round(bounds.w * 0.5 + 12);
  const ry = Math.max(4, Math.round(rx * 0.35));
  const head = (step / DRAGON_TURN) * TAU;
  const lit = b.lit();
  const a = b.intensity;

  // Tail first, so the head lands on top.
  for (let k = DRAGON_SEGMENTS - 1; k >= 0; k--) {
    const angle = head - k * DRAGON_GAP;

    if (Math.sin(angle) >= 0 !== front) continue;
    const x = Math.round(cx + Math.cos(angle) * rx);

    // The body undulates as it flies.
    const y = Math.round(
      cy + Math.sin(angle) * ry + Math.sin(step * 0.8 - k * 0.9) * 1.5,
    );

    if (k === 0) drawDragonHead(lit, x, y, -Math.sin(angle), b.tones, a);
    else if (k < 7) {
      // A 2 px thick body: dark back, lit belly.
      plot(lit, x, y, mid, a);
      plot(lit, x + 1, y, mid, a);
      plot(lit, x, y + 1, k < 4 ? light : mid, a * 0.9);
      plot(lit, x + 1, y + 1, k < 4 ? light : mid, a * 0.9);
      plot(lit, x, y - 1, dark, a * 0.8);
    } else plot(lit, x, y, k < 9 ? mid : dark, a);

    if (k === 3) drawDragonWings(lit, x, y, step, mid, dark, a);
  }
}

/** The dragon's head facing `dir` (−1 left, 1 right): snout, a horn and a hot eye. */
function drawDragonHead(
  lit: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  tones: readonly [Rgb, Rgb, Rgb],
  a: number,
): void {
  const [light, mid, dark] = tones;
  const f = dir < 0 ? -1 : 1;

  for (let dx = 0; dx < 3; dx++) {
    plot(lit, x + f * dx, y, mid, a);
    plot(lit, x + f * dx, y + 1, dx === 2 ? mid : light, a);
  }

  plot(lit, x + f * 3, y + 1, mid, a);
  plot(lit, x - f, y - 2, dark, a);
  plot(lit, x, y - 1, dark, a);
  plot(lit, x + f, y, [255, 255, 200], a);
  // A puff of fire ahead of the snout.
  plot(lit, x + f * 5, y + 1, light, a * 0.6);
}

/** Two bat wings off a body segment, raised and lowered every other step. */
function drawDragonWings(
  lit: CanvasRenderingContext2D,
  x: number,
  y: number,
  step: number,
  mid: Rgb,
  dark: Rgb,
  a: number,
): void {
  const up = step % 2 === 0;
  const tip = up ? -5 : -2;

  for (const side of [-1, 1]) {
    pixelLine(lit, x, y - 1, x + side * 4, y + tip, dark, a, a);
    pixelLine(
      lit,
      x + side * 4,
      y + tip,
      x + side * 2,
      y - 1,
      mid,
      a * 0.8,
      a * 0.8,
    );
  }
}

/** Crown: gem colours on its three points, left to right. */
const CROWN_GEMS: readonly Rgb[] = [
  [255, 70, 90],
  [90, 170, 255],
  [255, 70, 90],
];

/**
 * Crown: a small gold crown floating over the head, one pixel higher while `raised`, with a
 * glint running along its points every few steps. Pixels only.
 */
export function drawCrown(
  b: Brush,
  place: AuraPlacement,
  raised: boolean,
  step: number,
): void {
  const { head } = place.silhouette;
  const [light, mid, dark] = b.tones;
  const a = b.intensity;
  const lit = b.lit();
  const x = Math.round(place.x + head.x) - 4;
  const y = Math.round(place.y + head.y) - 6 - (raised ? 1 : 0);

  // The band, lit on top, shaded at the bottom.
  for (let i = 0; i < 9; i++) {
    plot(lit, x + i, y + 2, i % 4 === 0 ? light : mid, a);
    plot(lit, x + i, y + 3, dark, a * 0.8);
  }

  // Three points with their gems.
  for (const [n, px] of [0, 4, 8].entries()) {
    plot(lit, x + px, y, mid, a);
    plot(lit, x + px, y + 1, light, a);
    plot(lit, x + px, y + 2, CROWN_GEMS[n] ?? light, a);
  }

  plot(lit, x + 2, y + 1, mid, a * 0.8);
  plot(lit, x + 6, y + 1, mid, a * 0.8);
  const glint = step % 12;

  if (glint < 3)
    pixelGlint(lit, x + glint * 4, y, 1, [255, 255, 255], light, a * 0.9);
}

/**
 * Wings of shadow: two dark wings spread from the shoulders behind the character, their
 * leading edges lit, raised and lowered every few lite `step`s. Pixels only.
 */
export function drawWings(b: Brush, place: AuraPlacement, step: number): void {
  const { bounds } = place.silhouette;
  const [light, mid] = b.tones;
  const a = b.intensity;
  const dim = b.dim();
  const lit = b.lit();
  const cx = place.x + bounds.x + bounds.w / 2;
  const sy = place.y + bounds.y + Math.round(bounds.h * 0.28);
  const span = Math.round(clamp(bounds.w * 0.8 + 8, 16, 28));
  // Four poses: up, mid, down, mid.
  const lift = [-4, 0, 4, 0][Math.floor(step / 3) % 4] ?? 0;
  const shadow: Rgb = [16, 22, 26];

  for (const side of [-1, 1]) {
    const rootX = cx + side * 3;
    const tipX = cx + side * span;
    const tipY = sy - 10 + lift;

    // Feathers hanging from the leading edge, the outer ones longest.
    for (let f = 1; f <= 4; f++) {
      const k = f / 4;
      const px = rootX + (tipX - rootX) * k;
      const py = sy + (tipY - sy) * k;
      const endX = px + side * f * 0.7;
      const endY = py + 4 + f * 2.5;
      pixelLine(dim, px, py, endX, endY, shadow, a * 0.9, a * 0.9);
      plot(lit, endX, endY, f > 2 ? mid : light, a * 0.7);
    }

    pixelLine(lit, rootX, sy, tipX, tipY, mid, a, a * 0.8);
    plot(lit, tipX, tipY, light, a);
  }
}

/** Frost: ice crystals ringing the feet; those behind the feet draw before the character. */
export function drawShards(
  b: Brush,
  place: AuraPlacement,
  front: boolean,
  freeze: number,
): void {
  const intensity = b.intensity;
  const rx = groundRadius(place);
  const ry = rx * 0.36;
  const count = 11;
  const ctx = b.lit();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + 0.3;
    const depth = Math.sin(angle);

    if (depth > 0 !== front) continue;
    const x = Math.round(place.feetX + Math.cos(angle) * rx * 0.95);
    const y = Math.round(place.feetY - 2 + depth * ry * 0.95);

    // A freeze grows the crystals and shrinks them back.
    const height = Math.round((4 + ((i * 7919) % 5)) * (1 + freeze * 0.9));

    const lean = Math.round(Math.cos(angle) * 2);
    ctx.fillStyle = rgba([60, 150, 230], 0.9 * intensity);
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 1);
    ctx.lineTo(x + lean, y - height);
    ctx.lineTo(x + 2, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([235, 250, 255], 0.95 * intensity);
    ctx.beginPath();
    ctx.moveTo(x - 1, y);
    ctx.lineTo(x + lean, y - height + 1);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    if ((b.tick + i * 3) % 14 === 0)
      pixelGlint(
        ctx,
        x + lean,
        y - height,
        2,
        [255, 255, 255],
        [180, 240, 255],
        intensity,
      );
  }
}

/**
 * Quake: cracks in the air beside the character, as if it struck the air itself and the
 * world splintered: lines out from a point at chest height and rings joining them. `seed`
 * shapes them (a new one each quake), `strength` (0..1) is how bright they flash.
 */
export function drawAirCracks(
  b: Brush,
  place: AuraPlacement,
  seed: number,
  strength: number,
): void {
  if (strength <= 0.02) return;
  const rng = mulberry32(seed);
  const { bounds } = place.silhouette;
  const side = rng() < 0.5 ? -1 : 1;
  const cx = place.x + bounds.x + bounds.w / 2 + side * (bounds.w / 2 + 6);
  const cy = place.y + bounds.y + bounds.h * 0.4;
  const [light, mid] = b.tones;
  const lit = b.lit();
  const a = b.intensity * strength;
  const spokes = 7;
  const ends: [number, number][] = [];

  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * TAU + rng() * 0.6;
    const length = 9 + rng() * 9;
    let x = cx;
    let y = cy;

    // Each spoke in three kinked steps, so it reads as a crack, not a ray.
    for (let step = 1; step <= 3; step++) {
      const bend = angle + (rng() - 0.5) * 0.7;
      const nx = cx + Math.cos(bend) * length * (step / 3);
      const ny = cy + Math.sin(bend) * length * (step / 3);
      pixelLine(lit, x, y, nx, ny, step === 1 ? light : mid, a, a * 0.8);

      if (step === 2) ends.push([nx, ny]);
      x = nx;
      y = ny;
    }
  }

  // The ring of cross-cracks halfway out.
  for (const [i, [x0, y0]] of ends.entries()) {
    const [x1, y1] = ends[(i + 1) % ends.length] ?? [x0, y0];
    pixelLine(lit, x0, y0, x1, y1, mid, a * 0.7, a * 0.7);
  }

  pixelGlint(lit, cx, cy, 2, [255, 255, 255], light, a);
}
