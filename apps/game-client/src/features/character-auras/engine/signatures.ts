import { clamp } from "es-toolkit";
import { TAU, noise1, rgba, type Rgb } from "./math";
import {
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
