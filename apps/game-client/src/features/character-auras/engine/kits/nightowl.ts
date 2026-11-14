/**
 * Nocna sowa: night on the whole map but for a ring of moonlight round the character, and
 * in the dark 22 pairs of eyes that open, blink and follow the character. A small owl
 * circles its head. Its burst is the hunt: an owl as wide as the screen sweeps over the
 * map, its shadow putting everything out, and feathers snow down after it.
 */
import { sprite } from "../decor";
import { mulberry32, type Rgb } from "../math";
import { plot } from "../paint";
import { scatter, wash, washAround } from "../sky";
import { span, type AuraKit } from "./kit";

const NIGHT: Rgb = [4, 4, 18];

const MOON: Rgb = [216, 226, 255];

const AMBER: Rgb = [255, 200, 60];

/** Pairs of eyes in the dark. */
const EYES = 22;

const OWL_UP = ["#  #  #", "## # ##", " #####", "  o#o", "  ###"];

const OWL_DOWN = ["       ", "  ###", " #o#o#", "#######", "# ### #"];

/** Where each pair of eyes sits on the screen, 0..1, and when it blinks. */
const eyes = (() => {
  const rng = mulberry32(22);

  return Array.from({ length: EYES }, () => ({
    x: rng(),
    y: rng(),
    beat: 2 + rng() * 4,
    at: rng() * 6,
  }));
})();

export const nightowl: AuraKit = {
  gloom: 0.7,
  veil: NIGHT,
  burst: { length: 2.4, release: 0.35 },

  pieces(b, place, front) {
    const { head } = place.silhouette;
    const a = b.intensity;
    const hx = place.x + head.x;
    const hy = place.y + head.y;

    if (!front) {
      // A crescent behind the head: a disc with a bite out of it.
      for (let dy = -7; dy <= 7; dy++)
        for (let dx = -7; dx <= 7; dx++)
          if (Math.hypot(dx, dy) <= 7 && Math.hypot(dx - 4, dy - 2) > 6)
            plot(
              b.lit(),
              hx + 9 + dx + b.lag.x,
              hy - 8 + dy + b.lag.y,
              MOON,
              a,
            );
    }

    // The owl circling over the head, beating its wings.
    const angle = b.time * 1.5;

    if (Math.sin(angle) > 0 !== front) return;
    sprite(
      b.dim(),
      hx + Math.cos(angle) * 20,
      hy - 14 + Math.sin(angle) * 5,
      b.tick % 4 < 2 ? OWL_UP : OWL_DOWN,
      { "#": [120, 96, 70], o: AMBER },
      a,
    );
  },

  sky(scene) {
    const { ctx, width, height, now, x, y, burst } = scene;
    // The owl's shadow puts out even the moonlight for a moment.
    const sweep = span(burst, 0.2, 0.75);
    const dark = burst < 0 ? 0 : Math.sin(Math.PI * sweep);
    washAround(scene, NIGHT, 0.7, 55, 170);
    wash(scene, NIGHT, 0.5 * dark);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    for (const eye of eyes) {
      const ex = Math.round(eye.x * width);
      const ey = Math.round(eye.y * height);

      // None inside the moonlight, and each shut for a moment on its own beat.
      if (Math.hypot(ex - x, ey - y) < 150 || (now + eye.at) % eye.beat < 0.18)
        continue;
      // The pupils turn towards the character.
      const look = Math.sign(x - ex);
      const tilt = Math.sign(y - ey);

      for (const side of [-4, 4]) {
        ctx.fillStyle = "#ffc83c";
        ctx.fillRect(ex + side - 2, ey - 1, 4, 3);
        ctx.fillStyle = "#05050c";
        ctx.fillRect(ex + side - 1 + look, ey + (tilt > 0 ? 0 : -1), 2, 2);
      }
    }

    if (burst < 0.2) return;
    // The owl: body, head and two wings, from the top left to the bottom right.
    const ox = -width * 0.5 + sweep * width * 2;
    const oy = -height * 0.2 + sweep * height * 1.2;
    const wing = width * 0.55;
    const beat = Math.sin(sweep * 9) * height * 0.12;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#020208";
    ctx.beginPath();
    ctx.moveTo(ox - wing, oy - 40 + beat);
    ctx.quadraticCurveTo(ox - wing * 0.4, oy - 110, ox, oy - 30);
    ctx.quadraticCurveTo(ox + wing * 0.4, oy - 110, ox + wing, oy - 40 + beat);
    ctx.quadraticCurveTo(ox + wing * 0.5, oy + 30, ox + 40, oy + 70);
    ctx.lineTo(ox, oy + 120);
    ctx.lineTo(ox - 40, oy + 70);
    ctx.quadraticCurveTo(ox - wing * 0.5, oy + 30, ox - wing, oy - 40 + beat);
    ctx.fill();
    ctx.fillStyle = "#ffc83c";

    for (const side of [-18, 18]) {
      ctx.beginPath();
      ctx.arc(ox + side, oy - 20, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Feathers snowing down behind it.
    const fall = span(burst, 0.4, 1);
    ctx.fillStyle = "#d8cdb8";

    scatter(0, -now * 90, width, height, 46, 22, (fx, fy, p, q) => {
      ctx.globalAlpha = 0.8 * Math.sin(Math.PI * fall) * (0.5 + q * 0.5);
      ctx.fillRect(
        Math.round(fx + Math.sin(now * 3 + p * 30) * 8),
        Math.round(fy),
        p > 0.5 ? 4 : 3,
        1,
      );
    });
  },
};
