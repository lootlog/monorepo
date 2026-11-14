/**
 * Joker: the map as a card table. Cards circle the character and turn over, huge ones
 * lie on the map and flip, and a fan of a whole deck turns over the top of the screen.
 * Its burst shuffles the map itself: strips of it slide past each other, and the 53rd
 * card, a joker as tall as the screen, flies through before all of it falls back.
 */
import { mulberry32, rgba, type Rgb } from "../math";
import { plot } from "../paint";
import { scatter, wash } from "../sky";
import { moveRect, span, type AuraKit } from "./kit";

const PAPER: Rgb = [246, 240, 226];

const RED: Rgb = [214, 40, 54];

const INK: Rgb = [28, 26, 34];

/** Cards in a deck without its joker, and how many of them the fan shows. */
const FAN = 13;

/** A card face up at (`x`, `y`), `wide`×`tall`, with its pip; turned by `ctx`'s transform. */
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wide: number,
  tall: number,
  red: boolean,
): void {
  if (Math.abs(wide) < 1) return;
  ctx.fillStyle = rgba(PAPER, 1);
  ctx.fillRect(x - wide / 2, y - tall / 2, wide, tall);
  ctx.fillStyle = rgba(red ? RED : INK, 1);
  // The pip: a diamond.
  ctx.beginPath();
  ctx.moveTo(x, y - tall * 0.2);
  ctx.lineTo(x + wide * 0.24, y);
  ctx.lineTo(x, y + tall * 0.2);
  ctx.lineTo(x - wide * 0.24, y);
  ctx.closePath();
  ctx.fill();
}

export const joker: AuraKit = {
  gloom: 0.24,
  veil: [4, 34, 22],
  burst: { length: 2.6, release: 0.5 },

  pieces(b, place, front, burst) {
    const { bounds } = place.silhouette;
    const a = b.intensity;
    const cx = place.x + bounds.x + bounds.w / 2;
    const cy = place.y + bounds.y + bounds.h * 0.5;
    // The cards fly out wide as the map is shuffled.
    const rx = bounds.w / 2 + 14 + span(burst, 0, 0.5) * 14;

    for (let i = 0; i < 5; i++) {
      const angle = b.time * 1.4 + (i / 5) * Math.PI * 2;
      const depth = Math.sin(angle);

      if (depth > 0 !== front) continue;
      const x = Math.round(cx + Math.cos(angle) * rx);

      const y = Math.round(
        cy + depth * rx * 0.3 + Math.sin(b.time * 2 + i) * 3,
      );

      // Each card turns edge-on and back as it goes round.
      const half = Math.round(Math.abs(Math.cos(b.time * 2.2 + i * 1.3)) * 2);
      const back = Math.cos(b.time * 2.2 + i * 1.3) < 0;

      for (let dx = -half; dx <= half; dx++)
        for (let dy = -3; dy <= 3; dy++)
          plot(b.dim(), x + dx, y + dy, back ? RED : PAPER, a);

      if (!back && half === 2) plot(b.dim(), x, y, i % 2 ? RED : INK, a);
    }
  },

  sky(scene) {
    const { ctx, width, height, now, view, burst, time } = scene;
    const shuffle = span(burst, 0, 0.5) * (1 - span(burst, 0.5, 0.62));

    if (shuffle > 0) {
      // Strips of the map sliding past each other, a new deal every tick.
      const rng = mulberry32(Math.round(time * 5) * 53);
      const tall = Math.ceil(height / 8);

      for (let i = 0; i < 8; i++)
        moveRect(
          scene,
          0,
          i * tall,
          width,
          tall,
          Math.round((rng() - 0.5) * 160 * shuffle),
          0,
        );
    }

    wash(scene, [4, 34, 22], 0.24);

    // Huge cards lying on the map, turning over now and then.
    ctx.globalCompositeOperation = "source-over";

    scatter(view[0], view[1], width, height, 190, 53, (x, y, p, q) => {
      ctx.globalAlpha = 0.3;
      card(ctx, x, y, 46 * Math.cos(now * 0.6 + p * 20), 64, q > 0.5);
    });

    // The fan of a deck over the top of the screen, turning slowly.
    for (let i = 0; i < FAN; i++) {
      ctx.save();
      ctx.translate(width / 2, -height * 0.55);
      ctx.rotate((i - (FAN - 1) / 2) * 0.085 + Math.sin(now * 0.4) * 0.12);
      ctx.globalAlpha = 0.85;
      card(ctx, 0, height * 0.72, 40, 58, i % 2 === 0);
      ctx.restore();
    }

    if (burst < 0.5) return;
    // The fifty-third card: the joker, crossing the whole screen.
    const fly = span(burst, 0.5, 1);
    const jx = -200 + fly * (width + 400);
    ctx.save();
    ctx.translate(jx, height / 2);
    ctx.rotate(-0.25 + fly * 0.5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(PAPER, 1);
    ctx.fillRect(-110, -160, 220, 320);
    // A jester's cap: three points with bells, and a grin under it.
    ctx.fillStyle = rgba(RED, 1);
    ctx.beginPath();
    ctx.moveTo(-70, 10);
    ctx.lineTo(-90, -90);
    ctx.lineTo(-30, -30);
    ctx.lineTo(0, -120);
    ctx.lineTo(30, -30);
    ctx.lineTo(90, -90);
    ctx.lineTo(70, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(INK, 1);

    for (const [bx, by] of [
      [-90, -90],
      [0, -120],
      [90, -90],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 7;
    ctx.strokeStyle = rgba(INK, 1);
    ctx.beginPath();
    ctx.arc(0, 40, 50, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
    wash(scene, PAPER, 0.4 * (1 - fly) ** 4, "lighter");
  },
};
