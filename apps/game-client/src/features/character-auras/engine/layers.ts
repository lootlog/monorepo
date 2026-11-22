import type { PixelBounds } from "./pixel";
import type { AuraPlacement } from "./placement";
import { context2d, createCanvas, type AuraSilhouette } from "./silhouette";

export interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  used: boolean;
  soft: boolean;
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

export interface Snapshot {
  key: string;
  box: Box;
  bodyKey: string;
  bodySilhouette: AuraSilhouette | null;
  bodyBox: Box;
  x: number;
  y: number;
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

const MARGIN = 28;

const VIEW_SLACK = 16;

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
