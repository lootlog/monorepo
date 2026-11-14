/**
 * Architekt: the one who can edit the world. The character stands selected, in corner
 * brackets with a blinking cursor, on a wireframe disc; code rains behind it and its
 * shape splits into red and cyan ghosts that jump apart in fits. While the admin is on
 * the map the tile grid shows through it and a scan line sweeps down. Its burst reloads
 * the world: strips of the map jump sideways, then a sweep redraws it.
 */
import { clamp } from "es-toolkit";
import { mulberry32, smoothstep, TAU, type Rgb } from "./math";
import { pixelLine, plot, RUNES } from "./paint";
import type { Brush, TipFrame } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import { context2d, createCanvas } from "./silhouette";
import { wash, wrap, type MapScene } from "./sky";
import { tintedSilhouette } from "./summon";

const WHITE: Rgb = [255, 255, 255];

const CYAN: Rgb = [0, 232, 255];

const MAGENTA: Rgb = [255, 40, 200];

/** The map jumps about until this fraction of the burst, then the sweep redraws it. */
export const RELOAD_GLITCH = 0.4;

/** Ticks a fit of the ghosts lasts, and the share of such slots that have one. */
const FIT_TICKS = 3;

const FIT_CHANCE = 0.16;

/**
 * How far apart the character's ghosts are at `tick`, 0..1: a hair between fits, wide
 * in one, widest while the burst (0..1, -1 resting) tears the map.
 */
export function glitchLevel(tick: number, burst: number): number {
  if (burst >= 0 && burst < RELOAD_GLITCH) return 1;
  const roll = mulberry32(Math.floor(tick / FIT_TICKS) * 2654435761)();

  return roll < FIT_CHANCE ? 0.4 + (roll / FIT_CHANCE) * 0.5 : 0;
}

// --- round the character ------------------------------------------------------------------------

/** The disc under the feet: a lattice of dots turning slowly inside a dashed ring. */
export function drawWireGround(b: Brush, place: AuraPlacement): void {
  const lit = b.lit();
  const [light, mid, dark] = b.tones;
  const a = b.intensity;
  const rx = Math.round(groundRadius(place) * 1.25);
  const ry = Math.round(rx * 0.38);
  const cx = Math.round(place.feetX);
  const cy = Math.round(place.feetY) - 2;
  const turn = b.time * 0.25;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const pitch = 0.2;

  for (let u = -1; u <= 1.001; u += pitch) {
    for (let v = -1; v <= 1.001; v += pitch) {
      const x = u * cos - v * sin;
      const y = u * sin + v * cos;
      const reach = Math.hypot(x, y);

      if (reach > 0.95) continue;
      plot(lit, cx + x * rx, cy + y * ry, reach < 0.5 ? mid : dark, 0.75 * a);
    }
  }

  // Marching ants: dashes walking round the ring, as round a selection.
  const count = Math.round(TAU * rx);

  for (let i = 0; i < count; i++) {
    if (Math.floor((i + b.tick) / 3) % 2) continue;
    const angle = (i / count) * TAU;
    plot(lit, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, light, a);
  }
}

/** Cells in a column's lit tail, and the px between cells. */
const RAIN_TAIL = 7;

const RAIN_PITCH = 5;

/** One glyph of the rain: a 3×3 rune picked by `pick`. */
function glyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pick: number,
  color: Rgb,
  alpha: number,
): void {
  for (const [dx, dy] of RUNES[pick % RUNES.length] ?? [])
    plot(ctx, x + dx, y + dy, color, alpha);
}

/**
 * A column of code falling from `top` to `bottom` at `x`: its head white, the tail
 * fading through the aura's tones, the glyphs changing as it runs.
 */
function rainColumn(
  b: Brush,
  x: number,
  top: number,
  bottom: number,
  column: number,
): void {
  const [light, mid, dark] = b.tones;
  const span = bottom - top + RAIN_TAIL * RAIN_PITCH;
  const speed = 16 + ((column * 7919) % 5) * 4;
  const head = (b.time * speed + column * 37) % span;

  for (let row = 0; top + row * RAIN_PITCH <= bottom; row++) {
    const behind = (head - row * RAIN_PITCH) / RAIN_PITCH;

    if (behind < 0 || behind > RAIN_TAIL) continue;
    const pick = Math.floor(b.time * 3 + column * 3 + row * 5);

    const color =
      behind < 1 ? WHITE : behind < 3 ? light : behind < 5 ? mid : dark;

    glyph(
      b.lit(),
      Math.round(x),
      top + row * RAIN_PITCH,
      pick,
      color,
      (1 - behind / (RAIN_TAIL + 1)) * b.intensity,
    );
  }
}

/** Code raining behind the character, three columns either side of it. */
export function drawCodeRain(b: Brush, place: AuraPlacement): void {
  const { bounds } = place.silhouette;
  const cx = place.x + bounds.x + bounds.w / 2;
  const top = Math.round(place.y + bounds.y) - 18;
  const bottom = Math.round(place.feetY) - 4;

  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    rainColumn(b, cx + side * (bounds.w / 2 + 4 + (i % 3) * 7), top, bottom, i);
  }
}

/**
 * The selection round the character: four corner brackets that breathe, a tag over the
 * top left one and a blinking cursor. The burst switches it off like a screen, down to
 * one bright line, and back on.
 */
export function drawSelection(
  b: Brush,
  place: AuraPlacement,
  burst: number,
): void {
  const { bounds } = place.silhouette;
  const lit = b.lit();
  const [light, mid] = b.tones;
  const a = b.intensity;
  const grow = 4 + (Math.floor(b.tick / 6) % 2);
  const cx = Math.round(place.x + bounds.x + bounds.w / 2);
  const cy = Math.round(place.y + bounds.y + bounds.h / 2);
  const halfW = Math.round(bounds.w / 2) + grow;

  const open =
    burst < 0
      ? 1
      : burst < 0.2
        ? 1 - burst / 0.2
        : smoothstep(RELOAD_GLITCH, RELOAD_GLITCH + 0.2, burst);

  const halfH = Math.round((bounds.h / 2 + grow) * open);

  if (halfH < 2) {
    // Switched off: the line a screen leaves.
    pixelLine(lit, cx - halfW - 8, cy, cx + halfW + 8, cy, WHITE, a, a);

    return;
  }

  const arm = Math.min(5, halfH);

  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const x = cx + sx * halfW;
    const y = cy + sy * halfH;
    pixelLine(lit, x, y, x - sx * arm, y, light, a, a);
    pixelLine(lit, x, y, x, y - sy * arm, light, a, a);
    plot(lit, x, y, WHITE, a);
  }

  if (open < 1) return;
  const tagX = cx - halfW;
  const tagY = cy - halfH - 6;

  for (let dx = 0; dx < 10; dx++)
    for (let dy = 0; dy < 3; dy++)
      plot(
        lit,
        tagX + dx,
        tagY + dy,
        mid,
        (dx % 3 === 2 && dy === 1 ? 0.25 : 0.8) * a,
      );

  if (b.tick % 10 < 5)
    for (let dy = 0; dy < 3; dy++) {
      plot(lit, tagX + 12, tagY + dy, WHITE, a);
      plot(lit, tagX + 13, tagY + dy, WHITE, a);
    }
}

/**
 * The character's red and cyan ghosts straight onto the map behind it, `level` (0..1)
 * apart: a fringe at its edges between fits, two shapes thrown wide in one.
 */
export function drawGhosts(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  level: number,
  tick: number,
  intensity: number,
): void {
  const { silhouette } = place;
  const apart = 1 + Math.round(level * 6);
  const jolt = level > 0 ? (tick % 2 ? 1 : -1) : 0;
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = clamp(0.55 + level * 0.3, 0, 1) * intensity;

  for (const [color, side] of [
    [CYAN, -1],
    [MAGENTA, 1],
  ] as const) {
    const image = tintedSilhouette(silhouette, color);

    if (image)
      ctx.drawImage(
        image,
        Math.round(place.x) - silhouette.pad + side * apart,
        Math.round(place.y) - silhouette.pad + side * jolt,
      );
  }
}

/**
 * During a fit, bands of the character's shape knocked sideways over it, as if rows of
 * its picture were read from the wrong place.
 */
export function drawTornRows(
  ctx: CanvasRenderingContext2D,
  place: AuraPlacement,
  level: number,
  tick: number,
  color: Rgb,
  intensity: number,
): void {
  if (level <= 0) return;
  const { silhouette } = place;
  const image = tintedSilhouette(silhouette, color);

  if (!image) return;
  const { bounds, pad } = silhouette;
  const rng = mulberry32(tick * 7919 + 1);
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.55 * intensity;

  for (let i = 0; i < 3; i++) {
    const row = Math.floor(rng() * bounds.h);
    const tall = 2 + Math.floor(rng() * 5);
    const shift = Math.round((rng() - 0.5) * 2 * (3 + level * 7));
    ctx.drawImage(
      image,
      0,
      pad + bounds.y + row,
      image.width,
      tall,
      Math.round(place.x) - pad + shift,
      Math.round(place.y) + bounds.y + row,
      image.width,
      tall,
    );
  }
}

// --- the wireframe over the map -----------------------------------------------------------------

/** How much the wireframe dims the map, 0..1: just enough for the grid to read. */
export const WIREFRAME_GLOOM = 0.14;

export const WIREFRAME_VEIL: Rgb = [0, 12, 10];

/** The game's tile, px. */
const TILE = 32;

/** Seconds the scan line takes down the screen, and between tiles being inspected. */
const SCAN_EVERY = 5;

const INSPECT_EVERY = 0.6;

let strips: HTMLCanvasElement | null = null;

/**
 * Knocks a few strips of what is already drawn sideways. The strips are copied out
 * first and drawn back after, so the canvas is read once a frame however many there are.
 */
function tearMap(scene: MapScene, strength: number): void {
  const { ctx, width, height, time } = scene;
  const { a: scaleX, d: scaleY, e: shiftX, f: shiftY } = ctx.getTransform();
  const rng = mulberry32(Math.round(time * 10) * 31 + 7);

  const torn = Array.from({ length: 5 }, () => ({
    y: Math.floor(rng() * height),
    tall: 4 + Math.floor(rng() * 26),
    shift: Math.round((rng() - 0.5) * 2 * 46 * strength),
  }));

  const deviceWidth = Math.ceil(width * scaleX);
  const deviceTall = Math.ceil(30 * scaleY);
  strips ??= createCanvas(1, 1);

  if (strips.width < deviceWidth || strips.height < deviceTall * torn.length) {
    strips.width = Math.max(strips.width, deviceWidth);
    strips.height = Math.max(strips.height, deviceTall * torn.length);
  }

  const copy = context2d(strips);

  for (const [i, strip] of torn.entries())
    copy.drawImage(
      ctx.canvas,
      shiftX,
      strip.y * scaleY + shiftY,
      deviceWidth,
      strip.tall * scaleY,
      0,
      i * deviceTall,
      deviceWidth,
      strip.tall * scaleY,
    );

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;

  for (const [i, strip] of torn.entries()) {
    ctx.drawImage(
      strips,
      0,
      i * deviceTall,
      deviceWidth,
      strip.tall * scaleY,
      strip.shift,
      strip.y,
      width,
      strip.tall,
    );
  }

  // A fringe of colour on each strip, red one way and cyan the other.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.16 * strength;

  for (const strip of torn) {
    ctx.fillStyle = strip.shift > 0 ? "#ff28c8" : "#00e8ff";
    ctx.fillRect(0, strip.y, width, strip.tall);
  }
}

/**
 * The world's wireframe over the whole map: the tile grid, a scan line sweeping down, a
 * tile or two picked out as if inspected and, when the aura bursts, the map torn into
 * strips and then redrawn by a sweep from the left.
 */
export function drawWireframe(scene: MapScene): void {
  const { ctx, width, height, now, view, burst, light, mid } = scene;

  const reload =
    burst >= RELOAD_GLITCH ? (burst - RELOAD_GLITCH) / (1 - RELOAD_GLITCH) : -1;

  if (burst >= 0 && reload < 0)
    tearMap(scene, 1 - (burst / RELOAD_GLITCH) * 0.5);

  wash(scene, WIREFRAME_VEIL, WIREFRAME_GLOOM);

  // The grid on the game's tiles; it lights up as the reload redraws the map.
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgb(${mid[0]},${mid[1]},${mid[2]})`;
  ctx.globalAlpha = 0.07 + (reload >= 0 ? 0.25 * (1 - reload) : 0);

  for (let x = wrap(-view[0], TILE); x < width; x += TILE)
    ctx.fillRect(Math.round(x), 0, 1, height);

  for (let y = wrap(-view[1], TILE); y < height; y += TILE)
    ctx.fillRect(0, Math.round(y), width, 1);

  // The scan line with a short glow trailing above it.
  const scan = ((now % SCAN_EVERY) / SCAN_EVERY) * (height + 80) - 40;

  for (const [offset, tall, alpha] of [
    [0, 1, 0.3],
    [-6, 6, 0.08],
    [-20, 14, 0.04],
  ] as const) {
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, Math.round(scan + offset), width, tall);
  }

  // Two tiles picked out for a moment, with handles on their corners.
  const slot = Math.floor(now / INSPECT_EVERY);
  const rng = mulberry32(slot * 104729 + 3);
  const blink = 1 - (now / INSPECT_EVERY - slot);
  ctx.fillStyle = `rgb(${light[0]},${light[1]},${light[2]})`;

  for (let i = 0; i < 2; i++) {
    const x = Math.floor((view[0] + rng() * width) / TILE) * TILE - view[0];
    const y = Math.floor((view[1] + rng() * height) / TILE) * TILE - view[1];
    ctx.globalAlpha = 0.1 * blink;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.globalAlpha = 0.7 * blink;

    for (const [dx, dy] of [
      [0, 0],
      [TILE - 2, 0],
      [0, TILE - 2],
      [TILE - 2, TILE - 2],
    ] as const)
      ctx.fillRect(x + dx, y + dy, 2, 2);
  }

  if (reload < 0) return;
  // The sweep redrawing the map from the left, its trail fading behind it.
  const edge = reload * (width + 160);

  for (const [offset, wide, alpha] of [
    [0, 2, 0.8],
    [-24, 24, 0.14],
    [-90, 66, 0.06],
  ] as const) {
    ctx.globalAlpha = alpha * (1 - reload * 0.5);
    ctx.fillRect(Math.round(edge + offset), 0, wide, height);
  }

  wash(scene, light, 0.2 * (1 - reload) ** 4, "lighter");
}

// --- the tooltip --------------------------------------------------------------------------------

/** Brackets round the frame's corners and a cursor blinking beside the top right one. */
export function drawTipBrackets({
  b,
  corners,
  R,
  T,
  light,
  a,
}: TipFrame): void {
  const lit = b.lit();

  for (const [x, y, sx, sy] of corners) {
    const cx = x + sx * 3;
    const cy = y + sy * 3;
    pixelLine(lit, cx, cy, cx - sx * 6, cy, light, a, a);
    pixelLine(lit, cx, cy, cx, cy - sy * 6, light, a, a);
    plot(lit, cx, cy, WHITE, a);
  }

  if (b.tick % 10 < 5)
    for (let dy = 0; dy < 5; dy++) {
      plot(lit, R + 7, T - 3 + dy, WHITE, a);
      plot(lit, R + 8, T - 3 + dy, WHITE, a);
    }
}

/** Code raining down both sides of the frame, behind it. */
export function drawTipRain({ b, L, T, R, B }: TipFrame): void {
  for (const [i, x] of [L - 12, L - 6, R + 6, R + 12].entries())
    rainColumn(b, x, T - 6, B + 6, i);
}
