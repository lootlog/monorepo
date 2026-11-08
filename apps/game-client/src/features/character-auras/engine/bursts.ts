import { TAU, envelope, hslToRgb, type Rgb } from "./math";
import { DIAG, ORTHO, pixelArc, pixelEllipse, pixelGlint, plot } from "./paint";
import { drawMagicCircle, drawSouls, type Brush } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import type { BurstKind } from "./presets";
import type { AuraSilhouette } from "./silhouette";

/** What every burst visual draws from: the placement, the burst's progress and the tones. */
export interface BurstScene {
  place: AuraPlacement;
  intensity: number;
  /** Which half is drawn: in front of the character or behind it. */
  front: boolean;
  /** Burst progress, 0..1. */
  t: number;
  bounds: AuraSilhouette["bounds"];
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
  /** Horizontal centre of the opaque bounds on screen. */
  cx: number;
  /** `intensity` faded in and out over the burst. */
  fade: number;
}

/** Draws the running burst `kind` into the brush's layers. */
export function drawBurstScene(
  kind: BurstKind,
  b: Brush,
  scene: BurstScene,
): void {
  switch (kind) {
    case "descend":
      drawDescendBurst(b, scene);
      break;
    case "implode":
      drawImplodeBurst(b, scene);
      break;
    case "comet":
      drawCometBurst(b, scene);
      break;
    case "bloom":
      drawBloomBurst(b, scene);
      break;
    case "sweep":
      drawSweepBurst(b, scene);
      break;
    case "whirl":
      drawWhirlBurst(b, scene);
      break;
    case "sandspout":
      drawSandspoutBurst(b, scene);
      break;
    case "souls":
      drawSoulsBurst(b, scene);
      break;
    case "splash":
      drawSplashBurst(b, scene);
      break;
    case "ascend":
      drawAscendBurst(b, scene);
      break;
    case "conqueror":
      drawConquerorBurst(b, scene);
      break;
    case "eruption":
    case "freeze":
    case "strike":
    case "spores":
    case "bloodrain":
    case "aurora-flare":
    // The roar's rings spread from the dragon's jaws, which only the renderer knows.
    case "roar":
      break;
  }
}

function drawDescendBurst(
  b: Brush,
  { place, front, t, bounds, light, mid, dark, cx, fade }: BurstScene,
): void {
  // A halo lowering from above the head to the feet, with two fainter echoes behind it.
  const rx = Math.round(bounds.w * 0.55 + 4);
  const ry = Math.max(2, Math.round(rx * 0.3));
  const top = place.y + bounds.y - 10;

  const bottom = place.ground ? place.feetY - 2 : place.y + bounds.y + bounds.h;

  const y = top + (bottom - top) * t;
  pixelArc(b.lit(), cx, y, rx, ry, light, fade, front);
  pixelArc(b.lit(), cx, y - 3, rx, ry, mid, fade * 0.55, front);
  pixelArc(b.lit(), cx, y - 6, rx, ry, dark, fade * 0.3, front);
}

function drawImplodeBurst(
  b: Brush,
  { place, front, t, bounds, light, mid, dark, cx, fade }: BurstScene,
): void {
  // A sphere of light collapsing into the chest, then a flash and sparks (`updateBurst`).
  if (t > 0.85 || front) return;
  const cy = place.y + bounds.y + bounds.h * 0.45;
  const base = Math.max(bounds.w, bounds.h) * 0.5 + 22;
  const r = Math.max(1, base * (1 - t / 0.85));
  const squash = place.ground ? 0.85 : bounds.h / bounds.w;
  pixelEllipse(b.lit(), cx, cy, r, Math.max(1, r * squash), light, fade, 0, 1);
  pixelEllipse(
    b.lit(),
    cx,
    cy,
    r + 1,
    Math.max(1, (r + 1) * squash),
    mid,
    fade * 0.7,
    0,
    1,
  );
  pixelEllipse(
    b.lit(),
    cx,
    cy,
    r + 3,
    Math.max(1, (r + 3) * squash),
    dark,
    fade * 0.4,
    0,
    2,
  );
}

function drawCometBurst(
  b: Brush,
  { place, intensity, front, t, bounds, light, mid, dark, cx }: BurstScene,
): void {
  // A shooting star arcing over the head, left to right, with a three-tone tail.
  if (front) return;
  const x0 = cx - bounds.w / 2 - 34;
  const x1 = cx + bounds.w / 2 + 34;

  const at = (u: number): [number, number] => [
    x0 + (x1 - x0) * u,
    place.y + bounds.y - 6 - Math.sin(Math.PI * u) * 16,
  ];

  for (let i = 16; i >= 1; i--) {
    const u = t - i * 0.018;

    if (u < 0) continue;
    const [x, y] = at(u);
    const color = i < 4 ? light : i < 9 ? mid : dark;
    plot(b.lit(), x, y, color, (1 - i / 17) * intensity);

    if (i < 6) plot(b.lit(), x, y + 1, color, (1 - i / 6) * 0.6 * intensity);
  }

  const [x, y] = at(t);
  pixelGlint(b.lit(), x, y, 2, [255, 255, 255], light, intensity);
}

function drawBloomBurst(
  b: Brush,
  { place, intensity, front, t, light }: BurstScene,
): void {
  // Pixel flowers opening one after another round the feet, then wilting.
  if (!place.ground) return;
  const rx = groundRadius(place) * 0.95;
  const ry = rx * 0.36;
  const petals = b.palette;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU + 0.2;

    if (Math.sin(angle) > 0 !== front) continue;
    const local = (t - i * 0.06) / 0.6;

    if (local < 0 || local > 1) continue;
    const stage = local < 0.15 ? 0 : local < 0.3 ? 1 : 2;
    const a = envelope(local, 0, 0.3) * intensity;
    const x = place.feetX + Math.cos(angle) * rx;
    const y = place.feetY - 2 + Math.sin(angle) * ry;
    const petal = petals[i % 3] ?? light;
    plot(b.lit(), x, y + 1, [90, 160, 60], a);
    plot(b.lit(), x, y, stage ? [255, 224, 122] : petal, a);

    if (stage >= 1)
      for (const [ox, oy] of ORTHO) plot(b.lit(), x + ox, y + oy, petal, a);

    if (stage >= 2)
      for (const [ox, oy] of DIAG)
        plot(b.lit(), x + ox, y + oy, petal, a * 0.5);
  }
}

function drawSweepBurst(
  b: Brush,
  { place, intensity, front, t, bounds }: BurstScene,
): void {
  // Prism: a rainbow band climbing the outline.
  if (!front) return;
  const row = place.y + bounds.y + bounds.h * (1 - t);

  for (const site of place.silhouette.edge) {
    const y = place.y + site.y;

    if (Math.abs(y - row) > 2) continue;
    plot(
      b.lit(),
      place.x + site.x + site.nx,
      y,
      hslToRgb(b.time * 200 + site.x * 8, 1, 0.65),
      intensity,
    );
  }

  for (
    let x = Math.round(place.x + bounds.x) - 2;
    x <= place.x + bounds.x + bounds.w + 2;
    x += 2
  ) {
    plot(
      b.lit(),
      x,
      row,
      hslToRgb(b.time * 200 + x * 6, 1, 0.7),
      0.5 * intensity,
    );
  }
}

function drawWhirlBurst(
  b: Brush,
  { place, front, t, bounds, light, mid, cx, fade }: BurstScene,
): void {
  // Petals spiralling up round the body, behind and in front.
  const rx = bounds.w * 0.65 + 6;

  const bottom = place.ground ? place.feetY - 2 : place.y + bounds.y + bounds.h;

  const rise = bounds.h + 16;

  for (let i = 0; i < 14; i++) {
    const angle = t * TAU * 1.6 + (i * TAU) / 14;
    const depth = Math.sin(angle);

    if (depth > 0 !== front) continue;
    const u = (t * 1.2 + i / 14) % 1;
    const x = cx + Math.cos(angle) * rx * (0.8 + u * 0.4);
    const y = bottom - u * rise + depth * 3;
    const petal = b.palette[i % 3] ?? light;
    plot(b.dim(), x, y, petal, fade);
    plot(b.dim(), x + 1, y, b.palette[2] ?? mid, fade);
  }
}

function drawSandspoutBurst(
  b: Brush,
  { place, front, t, light, mid, cx, fade }: BurstScene,
): void {
  // A tornado of dashed rings, widening upwards, spinning fast.
  if (!place.ground) return;
  const height = Math.sin(Math.PI * t) * 1.1;

  for (let level = 0; level < 12; level++) {
    const y = place.feetY - 2 - level * 5 * height;
    const r = 5 + level * 2.3;

    for (let arm = 0; arm < 2; arm++) {
      for (let s2 = 0; s2 < 16; s2++) {
        const angle = b.time * 9 + level * 0.7 + arm * Math.PI + s2 * 0.12;

        const depth = Math.sin(angle);

        if (depth > 0 !== front) continue;
        plot(
          b.lit(),
          cx + Math.cos(angle) * r,
          y + depth * r * 0.25,
          s2 < 4 ? light : mid,
          Math.min(1, (1.2 - s2 / 16) * fade),
        );
      }
    }
  }
}

function drawSoulsBurst(
  b: Brush,
  { place, front, t, bounds }: BurstScene,
): void {
  if (!front) return;

  if (place.ground) drawSouls(b, place.feetX, place.feetY, t);
  else {
    // Tooltips: one soul up each side of the box, clear of the text.
    const bottom = place.y + bounds.y + bounds.h + 4;
    drawSouls(b, place.x + bounds.x - 6, bottom, t, [0]);
    drawSouls(b, place.x + bounds.x + bounds.w + 6, bottom, t, [0]);
  }
}

function drawSplashBurst(
  b: Brush,
  { place, front, t, light, mid, cx, fade }: BurstScene,
): void {
  // A water column shooting up from the feet and collapsing.
  if (!place.ground || !front || t > 0.5) return;
  const height = Math.sin((Math.PI * t) / 0.5) * 30;

  for (let dx = -2; dx <= 2; dx++) {
    const top = place.feetY - 2 - height * (1 - Math.abs(dx) * 0.2);

    for (let y = place.feetY - 2; y > top; y -= 1) {
      plot(
        b.lit(),
        cx + dx,
        y,
        Math.abs(dx) < 2 ? light : mid,
        fade * (0.5 + 0.5 * ((y - top) / height)),
      );
    }
  }
}

function drawAscendBurst(
  b: Brush,
  { place, front, t, bounds, light, cx, fade }: BurstScene,
): void {
  // The magic circle lifting off the ground to above the head.
  const bottom = place.ground ? place.feetY - 2 : place.y + bounds.y + bounds.h;

  const top = place.y + bounds.y - 10;
  const y = bottom + (top - bottom) * t;
  const rx = place.ground ? groundRadius(place) : bounds.w / 2 + 6;
  const ry = Math.max(2, Math.round(rx * 0.36));

  if (front) pixelArc(b.lit(), cx, y, rx, ry, light, fade, true);
  else drawMagicCircle(b, cx, y, rx, ry, 1);
}

function drawConquerorBurst(
  b: Brush,
  { place, intensity, front, t, bounds, light, mid, cx }: BurstScene,
): void {
  // A dark pressure wave rolling out from the body, its leading edge red.
  if (front || t > 0.7) return;
  const cy = place.y + bounds.y + bounds.h * 0.55;
  const r = 6 + (t / 0.7) * (Math.max(bounds.w, bounds.h) * 0.5 + 34);
  const squash = place.ground ? 0.7 : bounds.h / bounds.w;
  const a = (1 - t / 0.7) * intensity;
  pixelEllipse(
    b.dim(),
    cx,
    cy,
    r - 1,
    Math.max(1, (r - 1) * squash),
    [20, 0, 6],
    a,
    0,
    1,
  );
  pixelEllipse(b.lit(), cx, cy, r, Math.max(1, r * squash), light, a, 0, 1);
  pixelEllipse(
    b.lit(),
    cx,
    cy,
    r + 2,
    Math.max(1, (r + 2) * squash),
    mid,
    a * 0.5,
    0,
    2,
  );
}
