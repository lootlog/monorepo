import type { PixelBounds } from "./pixel";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

/** An offscreen buffer of one side's light (`lit`) or covering (`dim`) pixels. */
export interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  used: boolean;
  /** Something soft (gradient blobs) was drawn, so it needs the pixel finish; pixel-only layers skip it. */
  soft: boolean;
  /**
   * What the finish found drawn, so every frame copies only that: a layer's content
   * covers about a tenth of its box, and copying the rest costs the most without a GPU.
   */
  bounds: PixelBounds | null;
}

export interface Box {
  ox: number;
  oy: number;
  w: number;
  h: number;
}

function createLayer(): Layer {
  const canvas = createCanvas(1, 1);

  return {
    canvas,
    ctx: context2d(canvas, { willReadFrequently: true }),
    used: false,
    soft: true,
    bounds: null,
  };
}

/**
 * One side (behind or in front of the character) rendered at a tick. What hangs on the body
 * (ground, rays, flames, orbits…) and the particles, which live on the map, sit in separate
 * buffers: between ticks the first moves with the character and the second with the camera,
 * so neither needs redrawing until the next tick.
 */
export interface Snapshot {
  key: string;
  box: Box;
  /**
   * What the body buffers were last rendered for: the tick for most auras, a coarser step
   * for lite ones (`AuraPreset.lite`), whose body buffers outlive ticks.
   */
  bodyKey: string;
  bodySilhouette: AuraSilhouette | null;
  bodyBox: Box;
  /** The character's screen position when the body buffers were rendered. */
  x: number;
  y: number;
  /** The camera's screen position when the world buffers were rendered. */
  viewX: number;
  viewY: number;
  bodyLit: Layer;
  bodyDim: Layer;
  worldLit: Layer;
  worldDim: Layer;
}

export function createSnapshot(): Snapshot {
  return {
    key: "",
    box: { ox: 0, oy: 0, w: 0, h: 0 },
    bodyKey: "",
    bodySilhouette: null,
    bodyBox: { ox: 0, oy: 0, w: 0, h: 0 },
    x: 0,
    y: 0,
    viewX: 0,
    viewY: 0,
    bodyLit: createLayer(),
    bodyDim: createLayer(),
    worldLit: createLayer(),
    worldDim: createLayer(),
  };
}

/** Room around the padded silhouette for particles drifting away from it. */
const MARGIN = 28;

/** Camera drift a world buffer can move by between ticks. */
const VIEW_SLACK = 16;

/** Whether an aura at `place` lands inside a `width`×`height` view at all. */
export function isAuraInView(
  place: AuraPlacement,
  width: number,
  height: number,
): boolean {
  const box = boxOf(place);

  return (
    box.ox < width + VIEW_SLACK &&
    box.oy < height + VIEW_SLACK &&
    box.ox + box.w > -VIEW_SLACK &&
    box.oy + box.h > -VIEW_SLACK
  );
}

/**
 * The screen rect an aura at `place` can paint into this frame: its buffers
 * plus the drift a character or the camera makes between ticks.
 */
export function auraScreenBox(place: AuraPlacement) {
  const box = boxOf(place);

  return {
    x: box.ox - VIEW_SLACK,
    y: box.oy - VIEW_SLACK,
    width: box.w + VIEW_SLACK * 2,
    height: box.h + VIEW_SLACK * 2,
  };
}

export function boxOf(place: AuraPlacement): Box {
  const pad = place.silhouette.pad + MARGIN;

  return {
    ox: Math.round(place.x) - pad,
    oy: Math.round(place.y) - pad,
    w: place.silhouette.width + pad * 2,
    h: place.silhouette.height + pad * 2,
  };
}

function blitLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  box: Box,
  mode: GlobalCompositeOperation,
  dx: number,
  dy: number,
): void {
  const { bounds } = layer;

  if (!layer.used || !bounds) return;
  const w = bounds.right - bounds.left + 1;
  const h = bounds.bottom - bounds.top + 1;
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = 1;
  ctx.drawImage(
    layer.canvas,
    bounds.left,
    bounds.top,
    w,
    h,
    box.ox + dx + bounds.left,
    box.oy + dy + bounds.top,
    w,
    h,
  );
}

/** Copies a side's buffers to the screen: body ones follow the character, world ones the camera. */
export function blitSnapshot(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  place: AuraPlacement,
  which: "lit" | "dim",
): void {
  const mode = which === "lit" ? "lighter" : "source-over";
  const bodyX = Math.round(place.x) - snap.x;
  const bodyY = Math.round(place.y) - snap.y;
  const worldX = snap.viewX - Math.round(place.viewX);
  const worldY = snap.viewY - Math.round(place.viewY);

  blitLayer(
    ctx,
    which === "lit" ? snap.bodyLit : snap.bodyDim,
    snap.bodyBox,
    mode,
    bodyX,
    bodyY,
  );
  blitLayer(
    ctx,
    which === "lit" ? snap.worldLit : snap.worldDim,
    snap.box,
    mode,
    worldX,
    worldY,
  );
}
