import type { Brush } from "../decor";
import type { Rgb } from "../math";
import type { AuraPlacement } from "../placement";
import type { MapScene } from "../sky";

export interface AuraKit {
  gloom: number;
  veil: Rgb;
  burst: { length: number; release: number };
  pieces: (
    b: Brush,
    place: AuraPlacement,
    front: boolean,
    burst: number,
  ) => void;
  sky: (scene: MapScene) => void;
  doubles?: (
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    front: boolean,
    tick: number,
    burst: number,
    intensity: number,
  ) => void;
}

export function span(burst: number, from: number, to: number): number {
  if (burst < from) return 0;

  return Math.min(1, (burst - from) / (to - from));
}

export function moveRect(
  { ctx }: MapScene,
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
): void {
  if (w <= 0 || h <= 0 || (dx === 0 && dy === 0)) return;
  const { a, d, e, f } = ctx.getTransform();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    ctx.canvas,
    x * a + e,
    y * d + f,
    w * a,
    h * d,
    x + dx,
    y + dy,
    w,
    h,
  );
}
