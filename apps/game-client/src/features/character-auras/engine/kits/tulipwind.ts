/**
 * Tulipanowy wiatr: no glow round the character at all, only things that happen. A
 * windmill stands at the edge of the screen before a low sun, its sails turning, and
 * tulip petals ride the wind over the whole map; tulips grow at the character's feet.
 * Its burst is drawn like a finishing move: the sails spin up, tear loose and fly across
 * the screen as one great blade, the picture snaps to its negative for an instant, and
 * tulips come up all over the map in the blade's wake.
 */
import { sprite } from "../decor";
import { mulberry32, rgba, type Rgb } from "../math";
import { pixelLine } from "../paint";
import { scatter, wash } from "../sky";
import { span, type AuraKit } from "./kit";

const WHITE: Rgb = [255, 255, 255];

const TIMBER: Rgb = [28, 18, 12];

const SUN: Rgb = [255, 150, 60];

const LEAF: Rgb = [70, 150, 60];

/** Tulips, and the petals the wind carries. */
const BLOOMS: readonly Rgb[] = [
  [232, 50, 60],
  [255, 138, 30],
  [246, 240, 226],
  [255, 122, 176],
  [255, 214, 70],
];

/** The burst: the sails spin up, fly, the picture snaps, the tulips come up. */
const TORN_LOOSE = 0.3;

const IMPACT = 0.45;

/** How long the picture stays in its negative, as a fraction of the burst. */
const NEGATIVE = 0.035;

/** The length of a sail, px. */
const SAIL = 92;

const TULIP = [" # # ", " ### ", " ### ", "  l  ", " ll  ", "  l  "];

/** How far the sails have turned at `now`; they wind up through the start of a burst. */
function sailTurn(now: number, burst: number): number {
  const windUp = burst < 0 ? 0 : Math.min(1, burst / TORN_LOOSE) ** 3 * 26;

  return now * 0.5 + windUp;
}

/** Four sails round (`x`, `y`): each a spar with a lattice along one side of it. */
function drawSails(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  turn: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  for (let sail = 0; sail < 4; sail++) {
    ctx.rotate(Math.PI / 2);
    ctx.lineWidth = Math.max(2, length * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
    // The lattice: its frame and the bars across it.
    ctx.lineWidth = Math.max(1, length * 0.016);
    ctx.strokeRect(length * 0.24, 0, length * 0.76, length * 0.17);

    for (let bar = 1; bar < 6; bar++) {
      ctx.beginPath();
      ctx.moveTo(length * (0.24 + bar * 0.127), 0);
      ctx.lineTo(length * (0.24 + bar * 0.127), length * 0.17);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(length * 0.24, length * 0.085);
    ctx.lineTo(length, length * 0.085);
    ctx.stroke();
  }

  ctx.restore();
}

/** One tulip grown `grown` (0..1) of the way at (`x`, `y`): stem, leaf and cup. */
function drawTulip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  grown: number,
  color: Rgb,
): void {
  const stem = Math.round(9 * grown);
  ctx.fillStyle = rgba(LEAF, 1);
  ctx.fillRect(x, y - stem, 1, stem);

  if (grown < 0.5) return;
  ctx.fillRect(x + 1, y - 3, 2, 1);
  ctx.fillRect(x - 2, y - 5, 2, 1);

  if (grown < 0.8) return;
  ctx.fillStyle = rgba(color, 1);
  ctx.fillRect(x - 2, y - stem - 4, 2, 4);
  ctx.fillRect(x + 1, y - stem - 4, 2, 4);
  ctx.fillRect(x - 1, y - stem - 3, 2, 3);
}

export const tulipwind: AuraKit = {
  gloom: 0,
  veil: [10, 6, 4],
  burst: { length: 3.2, release: IMPACT },

  pieces(b, place, front) {
    const a = b.intensity;
    const { bounds } = place.silhouette;

    // Tulips round the feet, nodding in the wind; those behind go behind.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.5;

      if (Math.sin(angle) > 0 !== front) continue;
      const nod = Math.round(Math.sin(b.time * 2 + i * 1.7));
      sprite(
        b.dim(),
        place.feetX + Math.cos(angle) * (bounds.w / 2 + 6) + nod,
        place.feetY - 3 + Math.sin(angle) * 5,
        TULIP,
        { "#": BLOOMS[i % BLOOMS.length] ?? WHITE, l: LEAF },
        a,
      );
    }

    if (!front) return;

    // The wind itself: a few short strokes passing the body.
    for (let i = 0; i < 3; i++) {
      const along = (b.time * (0.9 + i * 0.3) + i * 0.4) % 1;
      const x = place.x + bounds.x + bounds.w + 16 - along * (bounds.w + 44);
      const y = place.y + bounds.y + bounds.h * (0.25 + i * 0.25);
      pixelLine(
        b.lit(),
        x,
        y,
        x + 7,
        y,
        WHITE,
        0.5 * Math.sin(Math.PI * along) * a,
        0,
      );
    }
  },

  sky(scene) {
    const { ctx, width, height, now, view, burst, time, y } = scene;
    const active = burst >= 0;
    const millX = width - 96;
    const hubY = height - 168;

    // The low sun behind the mill.
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(SUN, 1);

    for (const [radius, alpha] of [
      [150, 0.08],
      [96, 0.14],
      [58, 0.22],
    ] as const) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(millX - 26, hubY + 30, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // The mill: its tower narrowing upwards, a cap and a door.
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = rgba(TIMBER, 1);
    ctx.beginPath();
    ctx.moveTo(millX - 44, height + 4);
    ctx.lineTo(millX - 22, hubY + 8);
    ctx.lineTo(millX + 22, hubY + 8);
    ctx.lineTo(millX + 44, height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(millX, hubY + 8, 28, 20, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = rgba(SUN, 1);
    ctx.globalAlpha = 0.7;
    ctx.fillRect(millX - 5, hubY + 62, 10, 14);

    // Its sails, unless they are away across the screen.
    const flight = span(burst, TORN_LOOSE, IMPACT + 0.12);
    const back = active ? span(burst, 0.82, 1) : 1;
    const home = active && burst >= TORN_LOOSE ? back : 1;

    if (home > 0) {
      ctx.globalAlpha = 0.92 * home;
      drawSails(
        ctx,
        millX,
        hubY,
        SAIL,
        sailTurn(now, home < 1 ? -1 : burst),
        rgba(TIMBER, 1),
      );
    }

    // Petals on the wind over the whole map, tumbling as they go.
    ctx.globalAlpha = 1;

    scatter(
      view[0] + now * 54,
      view[1] - now * 16,
      width,
      height,
      72,
      67,
      (px, py, p, q) => {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = rgba(BLOOMS[Math.floor(p * BLOOMS.length)] ?? WHITE, 1);
        const flat = Math.sin(now * (3 + q * 4) + p * 20) > 0;
        ctx.fillRect(
          Math.round(px),
          Math.round(py + Math.sin(now * 2 + q * 30) * 6),
          flat ? 3 : 2,
          flat ? 2 : 3,
        );
      },
    );

    if (!active) return;

    // Speed lines: the wind drawn across the whole picture, thickest at the impact.
    const rush =
      burst < IMPACT ? burst / IMPACT : 1 - span(burst, IMPACT, 0.75);

    const rng = mulberry32(Math.round(time * 10) * 211 + 1);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < 34; i++) {
      const length = (60 + rng() * 240) * rush;
      ctx.globalAlpha = (0.15 + rng() * 0.35) * rush;
      ctx.fillRect(
        Math.round(rng() * width),
        Math.round(rng() * height),
        length,
        rng() < 0.2 ? 2 : 1,
      );
    }

    // The sails torn loose: one great blade spinning across to the left, over the character.
    if (burst >= TORN_LOOSE && flight < 1) {
      const ease = flight * flight;
      const bx = millX + (-160 - millX) * ease;
      const by = hubY + (y - hubY) * Math.min(1, flight * 1.6);
      const size = SAIL * (1 + flight * 0.5);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35;
      drawSails(ctx, bx + 26, by, size, now * 22 - 0.5, rgba(SUN, 1));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      drawSails(ctx, bx, by, size, now * 22, "#fff6e2");
    }

    if (burst < IMPACT) return;

    // The impact frame: the whole picture in its negative, for an instant.
    if (burst < IMPACT + NEGATIVE) wash(scene, WHITE, 1, "difference");

    // The cut it leaves, straight across through the character, closing fast.
    const cut = 1 - span(burst, IMPACT, IMPACT + 0.14);

    if (cut > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = cut;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        Math.round(y - 1 - cut * 5),
        width,
        Math.round(2 + cut * 10),
      );
    }

    // Tulips coming up all over the map, right to left as the blade passed, then gone.
    const gone = 1 - span(burst, 0.9, 1);
    ctx.globalCompositeOperation = "source-over";

    scatter(view[0], view[1], width, height, 46, 31, (tx, ty, p, q) => {
      const delay = (1 - tx / width) * 0.2 + q * 0.04;
      const grown = span(burst, IMPACT + 0.02 + delay, IMPACT + 0.12 + delay);

      if (grown <= 0) return;
      ctx.globalAlpha = gone;
      drawTulip(
        ctx,
        Math.round(tx),
        Math.round(ty),
        grown,
        BLOOMS[Math.floor(p * BLOOMS.length)] ?? WHITE,
      );
    });
  },
};
