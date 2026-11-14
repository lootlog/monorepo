/**
 * Dziewięć szpilek: everyone on this map hangs on strings. Threads drop from the top of
 * the screen all over the map, nine candles burn in a ring round the character and a
 * sign is drawn on the ground between them. A doll floats at the character's side. Its
 * burst is the pin: a doll as big as the screen appears over the map, the pin goes in,
 * the threads jerk and the whole map jumps.
 */
import { sprite } from "../decor";
import { mulberry32, rgba, TAU, type Rgb } from "../math";
import { pixelLine } from "../paint";
import { scatter, wash } from "../sky";
import { moveRect, span, type AuraKit } from "./kit";

const DARK: Rgb = [10, 2, 16];

const SMOKE: Rgb = [150, 90, 230];

const SICK: Rgb = [110, 230, 120];

const CLOTH: Rgb = [176, 140, 96];

/** Candles round the character, and pins in the doll. */
const NINE = 9;

/** The ring of candles: its radius, px, and how flat it lies. */
const RING = 150;

const SQUASH = 0.55;

const DOLL = [" ### ", "#x#x#", " ### ", "#####", " ### ", " # # "];

export const ninepins: AuraKit = {
  gloom: 0.34,
  veil: DARK,
  burst: { length: 2.4, release: 0.4 },

  pieces(b, place, front, burst) {
    if (!front) return;
    const { bounds } = place.silhouette;
    const a = b.intensity;
    const x = Math.round(place.x + bounds.x + bounds.w + 9 + b.lag.x);
    // The doll bobs, and jolts when the pin goes in.
    const jolt = burst >= 0.4 && burst < 0.5 ? -3 : 0;

    const y =
      Math.round(
        place.y +
          bounds.y +
          bounds.h * 0.4 +
          Math.sin(b.time * 2) * 2 +
          b.lag.y,
      ) + jolt;

    sprite(b.dim(), x, y, DOLL, { "#": CLOTH, x: [30, 10, 10] }, a);
    // Its pin, and the thread it hangs on.
    pixelLine(b.lit(), x + 2, y - 1, x + 7, y - 6, [255, 255, 255], a, a);
    pixelLine(b.lit(), x, y - 4, x, y - 22, SMOKE, 0.6 * a, 0.05 * a);
  },

  sky(scene) {
    const { ctx, width, height, x, feetY, now, view, burst, time } = scene;
    const stab = span(burst, 0.4, 0.55);

    // The whole map jumps as the pin goes in.
    if (burst >= 0.4 && stab < 1) {
      const rng = mulberry32(Math.round(time * 10) * 9);
      moveRect(
        scene,
        0,
        0,
        width,
        height,
        0,
        -Math.round((1 - stab) * 10 * (0.5 + rng())),
      );
    }

    wash(scene, DARK, 0.34);

    // Threads from the top of the screen, all over the map, swaying; taut in the burst.
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(SMOKE, 1);
    ctx.globalAlpha = burst >= 0 ? 0.5 : 0.24;
    ctx.beginPath();

    scatter(view[0], view[1], width, height, 130, 9, (tx, ty, p) => {
      const sway = burst >= 0 ? 0 : Math.sin(now * 0.9 + p * 20) * 14;
      ctx.moveTo(tx + sway, 0);
      ctx.lineTo(tx, ty);
      ctx.moveTo(tx - 5, ty);
      ctx.lineTo(tx + 5, ty);
    });

    ctx.moveTo(x, 0);
    ctx.lineTo(x, feetY - 60);
    ctx.stroke();

    // The sign on the ground: a cross with barbed arms inside the ring of candles.
    ctx.globalAlpha = 0.3 + 0.1 * Math.sin(now * 2);
    ctx.strokeStyle = rgba(SICK, 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let arm = 0; arm < 4; arm++) {
      const angle = (arm / 4) * TAU + now * 0.05;
      const ex = x + Math.cos(angle) * RING * 0.8;
      const ey = feetY + Math.sin(angle) * RING * 0.8 * SQUASH;
      ctx.moveTo(x, feetY);
      ctx.lineTo(ex, ey);

      for (const side of [-0.5, 0.5]) {
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - Math.cos(angle + side) * 22,
          ey - Math.sin(angle + side) * 22 * SQUASH,
        );
      }
    }

    ctx.stroke();

    // Nine candles, their flames guttering; they flare when the pin goes in.
    for (let i = 0; i < NINE; i++) {
      const angle = (i / NINE) * TAU;
      const cx = Math.round(x + Math.cos(angle) * RING);
      const cy = Math.round(feetY + Math.sin(angle) * RING * SQUASH);

      const flame =
        3 +
        Math.round(Math.abs(Math.sin(now * 9 + i * 2)) * 2) +
        (stab > 0 && stab < 1 ? 6 : 0);

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e8dcc0";
      ctx.fillRect(cx - 1, cy - 9, 3, 9);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#ffc24a";
      ctx.fillRect(cx - 1, cy - 9 - flame, 3, flame);
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 12, 0, TAU);
      ctx.fill();
    }

    if (burst < 0) return;
    // The doll over the map, and the pin driven into it.
    const show = Math.sin(Math.PI * Math.min(1, burst * 1.05));
    const dx = width / 2;
    const dy = height * 0.3;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.85 * show;
    ctx.fillStyle = rgba(CLOTH, 1);
    ctx.beginPath();
    ctx.arc(dx, dy - 70, 46, 0, TAU);
    ctx.fill();
    ctx.fillRect(dx - 34, dy - 30, 68, 120);
    ctx.fillRect(dx - 110, dy - 20, 220, 30);
    ctx.fillRect(dx - 34, dy + 90, 26, 60);
    ctx.fillRect(dx + 8, dy + 90, 26, 60);
    ctx.strokeStyle = "#1e0a0a";
    ctx.lineWidth = 5;
    ctx.beginPath();

    // Crossed-out eyes and a stitched mouth.
    for (const side of [-18, 18]) {
      ctx.moveTo(dx + side - 8, dy - 86);
      ctx.lineTo(dx + side + 8, dy - 70);
      ctx.moveTo(dx + side + 8, dy - 86);
      ctx.lineTo(dx + side - 8, dy - 70);
    }

    ctx.moveTo(dx - 20, dy - 48);
    ctx.lineTo(dx + 20, dy - 48);
    ctx.stroke();

    if (burst < 0.3) return;
    // The pin, from the upper right into the chest.
    const drive = span(burst, 0.3, 0.4);
    const px = dx + 170 - drive * 150;
    const py = dy - 150 + drive * 150;
    ctx.globalAlpha = show;
    ctx.strokeStyle = "#f4f4ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 90, py - 90);
    ctx.stroke();
    ctx.fillStyle = "#e0303c";
    ctx.beginPath();
    ctx.arc(px + 94, py - 94, 12, 0, TAU);
    ctx.fill();
    wash(scene, SICK, 0.3 * (stab > 0 ? (1 - stab) ** 2 : 0), "lighter");
  },
};
