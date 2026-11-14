/**
 * Trzy twarze: three in one. A great crescent hangs over the map and the screen stands
 * in three panes, each lit its own way, their edges drifting. Two more shapes of the
 * character stand at its sides and change places every 23 ticks. Its burst breaks the
 * mirror: the panes slide apart, the crescent falls across the screen like a blade, and
 * the three close into one again.
 */
import { rgba, type Rgb } from "../math";
import { plot } from "../paint";
import { wash } from "../sky";
import { tintedSilhouette } from "../summon";
import { moveRect, span, type AuraKit } from "./kit";

const MOON: Rgb = [226, 232, 255];

const DARK: Rgb = [6, 8, 22];

/** The light of each pane, left to right. */
const PANES: readonly Rgb[] = [
  [70, 110, 255],
  [255, 255, 255],
  [170, 90, 255],
];

/** How far each pane slides when the mirror breaks, px. */
const SLIDES = [-46, 34, -26] as const;

/** Ticks between the two side shapes changing places. */
const SWAP = 23;

/** Traces a crescent of radius `r` at (`x`, `y`), its horns turned by `turn`. */
function crescent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  turn: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(r * 0.45, 0, r * 0.9, Math.PI * 1.34, Math.PI * 0.66, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Where the two edges between the panes stand at `now`. */
function edges(width: number, now: number): [number, number] {
  return [
    Math.round(width / 3 + Math.sin(now * 0.31) * 46),
    Math.round((width * 2) / 3 + Math.cos(now * 0.27) * 46),
  ];
}

export const threefaces: AuraKit = {
  gloom: 0.3,
  veil: DARK,
  burst: { length: 2.6, release: 0.62 },

  pieces(b, place, front) {
    if (front) return;
    // A crescent behind the head.
    const { head } = place.silhouette;
    const cx = place.x + head.x - 8 + b.lag.x;
    const cy = place.y + head.y - 9 + b.lag.y;

    for (let dy = -8; dy <= 8; dy++)
      for (let dx = -8; dx <= 8; dx++)
        if (Math.hypot(dx, dy) <= 8 && Math.hypot(dx + 4, dy + 1) > 7)
          plot(b.lit(), cx + dx, cy + dy, MOON, b.intensity);
  },

  doubles(ctx, place, front, tick, burst, intensity) {
    if (front) return;
    const { silhouette } = place;
    // The two change sides in a quick slide every `SWAP` ticks; in the burst they go wide.
    const turn = Math.floor(tick / SWAP);
    const slide = Math.min(1, (tick % SWAP) / 4);
    const side = (turn % 2 ? -1 : 1) * (slide * 2 - 1);
    const apart = 15 + (burst >= 0 ? Math.sin(Math.PI * burst) * 24 : 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.5 * intensity;

    for (const [color, way] of [
      [PANES[0], 1],
      [PANES[2], -1],
    ] as const) {
      const image = color ? tintedSilhouette(silhouette, color) : null;

      if (image)
        ctx.drawImage(
          image,
          Math.round(place.x + way * side * apart) - silhouette.pad,
          Math.round(place.y) - silhouette.pad,
        );
    }
  },

  sky(scene) {
    const { ctx, width, height, now, burst } = scene;
    const [first, second] = edges(width, now);
    const bounds = [0, first, second, width];

    const broken =
      burst < 0 ? 0 : span(burst, 0, 0.2) * (1 - span(burst, 0.62, 0.7));

    // The panes slide apart along their edges.
    if (broken > 0)
      for (const [i, slide] of SLIDES.entries())
        moveRect(
          scene,
          bounds[i] ?? 0,
          0,
          (bounds[i + 1] ?? 0) - (bounds[i] ?? 0),
          height,
          0,
          Math.round(slide * broken),
        );

    wash(scene, DARK, 0.3);
    ctx.globalCompositeOperation = "lighter";

    for (const [i, color] of PANES.entries()) {
      ctx.globalAlpha = i === 1 ? 0.04 : 0.11;
      ctx.fillStyle = rgba(color, 1);
      ctx.fillRect(
        bounds[i] ?? 0,
        0,
        (bounds[i + 1] ?? 0) - (bounds[i] ?? 0),
        height,
      );
    }

    // The edges between the panes, bright while the mirror is broken.
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.25 + broken * 0.6;
    ctx.fillRect(first, 0, 1 + Math.round(broken * 2), height);
    ctx.fillRect(second, 0, 1 + Math.round(broken * 2), height);

    // The great crescent over the map, with its glow.
    const fall = span(burst, 0.3, 0.62);
    const falling = burst >= 0.3 && burst < 0.7;
    const mx = falling ? width * (0.84 - fall * 0.7) : width * 0.84;
    const my = falling ? height * (0.2 + fall * 0.7) : height * 0.2;
    ctx.fillStyle = rgba(MOON, 1);
    ctx.globalAlpha = 0.14;
    crescent(ctx, mx, my, 84, -0.5 - fall * 4);
    ctx.globalAlpha = 0.9;
    crescent(ctx, mx, my, 68, -0.5 - fall * 4);

    if (falling) {
      // The blade's wake.
      ctx.globalAlpha = 0.5 * (1 - fall);
      ctx.strokeStyle = rgba(MOON, 1);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.84, height * 0.2);
      ctx.lineTo(mx, my);
      ctx.stroke();
    }

    if (burst < 0.62) return;
    // The three close into one.
    const closed = span(burst, 0.62, 1);
    wash(scene, MOON, 0.45 * (1 - closed) ** 3, "lighter");
  },
};
