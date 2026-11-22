import { sprite } from "../decor";
import { rgba, TAU, type Rgb } from "../math";
import { pixelEllipse, pixelLine, plot } from "../paint";
import { groundRadius } from "../placement";
import { wash } from "../sky";
import { span, type AuraKit } from "./kit";

const GOLD: Rgb = [255, 176, 70];

const AMBER: Rgb = [255, 150, 20];

const RED: Rgb = [230, 50, 40];

const DARK: Rgb = [20, 10, 4];

const HOURS = 13;

const TURN = 52;

const DIAL = 240;

const SQUASH = 0.55;

const BELL = ["  #  ", " ### ", " ### ", "#####", "  o  "];

export const thirteenth: AuraKit = {
  gloom: 0.14,
  veil: DARK,
  burst: { length: 3.4, release: 0.8 },

  pieces(b, place, front, burst) {
    const a = b.intensity;

    if (front) {
      const { head } = place.silhouette;

      const swing =
        burst >= 0 && burst < 0.8
          ? Math.round(Math.sin(burst * 13 * Math.PI * 1.25) * 3)
          : 0;

      sprite(
        b.dim(),
        place.x + head.x + swing + b.lag.x,
        place.y + head.y - 12 + b.lag.y,
        BELL,
        { "#": [214, 160, 70], o: [255, 236, 170] },
        a,
      );

      return;
    }

    const rx = Math.round(groundRadius(place) * 1.3);
    const ry = Math.round(rx * 0.38);
    const cx = Math.round(place.feetX);
    const cy = Math.round(place.feetY) - 2;
    pixelEllipse(b.lit(), cx, cy, rx, ry, GOLD, a, 0, 1);

    for (let i = 0; i < HOURS; i++) {
      const angle = (i / HOURS) * TAU;
      plot(
        b.lit(),
        cx + Math.cos(angle) * rx * 0.82,
        cy + Math.sin(angle) * ry * 0.82,
        i ? GOLD : RED,
        a,
      );
    }

    const turn = (b.time / TURN) * TAU;
    pixelLine(
      b.dim(),
      cx,
      cy,
      cx + Math.cos(turn) * rx,
      cy + Math.sin(turn) * ry,
      DARK,
      0.9 * a,
      0.5 * a,
    );
  },

  sky(scene) {
    const { ctx, x, feetY, now, burst } = scene;
    const tolls = burst < 0 ? 0 : Math.min(HOURS, burst / (0.8 / HOURS));
    const struck = Math.floor(tolls);
    const out = span(burst, 0.8, 0.92);
    wash(scene, GOLD, 0.12, "lighter");

    const turn = (now / TURN) * TAU;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = rgba(DARK, 1);
    ctx.beginPath();
    ctx.moveTo(x - Math.sin(turn) * 5, feetY + Math.cos(turn) * 3);
    ctx.lineTo(
      x + Math.cos(turn) * DIAL * 1.6,
      feetY + Math.sin(turn) * DIAL * 1.6 * SQUASH,
    );
    ctx.lineTo(x + Math.sin(turn) * 5, feetY - Math.cos(turn) * 3);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(GOLD, 1);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(x, feetY, DIAL, DIAL * SQUASH, 0, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < HOURS; i++) {
      const angle = (i / HOURS) * TAU - Math.PI / 2;
      const last = i === HOURS - 1;
      ctx.globalAlpha = i < struck ? 1 : 0.4;
      ctx.lineWidth = i < struck ? 4 : 2;
      ctx.strokeStyle = rgba(last ? RED : GOLD, 1);
      ctx.beginPath();
      ctx.moveTo(
        x + Math.cos(angle) * DIAL * 0.88,
        feetY + Math.sin(angle) * DIAL * 0.88 * SQUASH,
      );
      ctx.lineTo(
        x + Math.cos(angle) * DIAL,
        feetY + Math.sin(angle) * DIAL * SQUASH,
      );
      ctx.stroke();
    }

    if (burst < 0) return;
    wash(scene, DARK, 0.6 * (struck / HOURS) * (1 - out));

    if (burst < 0.8) return;
    const back = span(burst, 0.92, 1);
    wash(scene, DARK, 0.75 * out * (1 - back));
    wash(scene, AMBER, 0.3 * out * (1 - back), "lighter");
    wash(
      scene,
      [255, 244, 214],
      0.5 * (back > 0 ? (1 - back) ** 2 : 0),
      "lighter",
    );
  },
};
