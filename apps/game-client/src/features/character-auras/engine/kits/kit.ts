/**
 * An aura made as one kit: its pieces round the character, what it lays over the whole
 * map and how its burst runs. The renderer drives every kit the same way, so a new aura
 * of this kind is one module and one line in `KITS`.
 */
import type { Brush } from "../decor";
import type { Rgb } from "../math";
import type { AuraPlacement } from "../placement";
import type { MapScene } from "../sky";

export interface AuraKit {
  /** How much the kit dims the map all the time, 0..1, and with what colour. */
  gloom: number;
  veil: Rgb;
  /** The burst: how long it runs, s, and the fraction at which it is released. */
  burst: { length: number; release: number };
  /** The pieces round the character each tick; `burst` is 0..1, or -1 while it rests. */
  pieces: (
    b: Brush,
    place: AuraPlacement,
    front: boolean,
    burst: number,
  ) => void;
  /** What lies over the whole map each frame. */
  sky: (scene: MapScene) => void;
  /** The character's own shape drawn straight onto the map, behind it or before it. */
  doubles?: (
    ctx: CanvasRenderingContext2D,
    place: AuraPlacement,
    front: boolean,
    tick: number,
    burst: number,
    intensity: number,
  ) => void;
}

/** How far `burst` is between `from` and `to`, 0..1; 0 while the burst rests. */
export function span(burst: number, from: number, to: number): number {
  if (burst < from) return 0;

  return Math.min(1, (burst - from) / (to - from));
}

/**
 * Moves a rect of what is already drawn on the map by (`dx`, `dy`): a strip of the map
 * knocked aside, a half of it parting. What it leaves behind stays as it was.
 */
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
