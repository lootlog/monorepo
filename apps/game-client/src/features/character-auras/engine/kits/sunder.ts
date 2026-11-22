import { rgba, type Rgb } from "../math";
import { pixelGlint, plot } from "../paint";
import { groundRadius } from "../placement";
import { scatter, wash } from "../sky";
import { moveRect, type AuraKit } from "./kit";

const WHITE: Rgb = [255, 255, 255];

const GOLD: Rgb = [255, 222, 140];

const EARTH: Rgb = [16, 10, 6];

const CLAY: Rgb = [200, 130, 70];

const STROKES = [0.12, 0.42, 0.74] as const;

const GAPS = [46, 90, 0] as const;

function gapAt(burst: number): number {
  let gap = 0;

  for (const [i, at] of STROKES.entries()) {
    if (burst < at) break;
    const before = i ? (GAPS[i - 1] ?? 0) : 0;
    const k = Math.min(1, (burst - at) / 0.06);
    gap = before + ((GAPS[i] ?? 0) - before) * k;
  }

  return gap;
}

export const sunder: AuraKit = {
  gloom: 0.3,
  veil: EARTH,
  burst: { length: 2.8, release: STROKES[2] },

  pieces(b, place, front) {
    const a = b.intensity;
    const { bounds } = place.silhouette;

    if (!front) {
      const rx = Math.round(groundRadius(place) * 1.2);
      const ry = Math.round(rx * 0.4);
      const cx = Math.round(place.feetX);
      const cy = Math.round(place.feetY) - 2;
      const cos = Math.cos(b.time * 0.9);
      const sin = Math.sin(b.time * 0.9);

      for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          const px = dx / rx;
          const py = dy / ry;

          if (px * px + py * py > 1) continue;
          const u = px * cos + py * sin;
          const v = py * cos - px * sin;
          const upper = Math.hypot(u, v - 0.5);
          const lower = Math.hypot(u, v + 0.5);

          const light =
            upper < 0.16
              ? false
              : lower < 0.16
                ? true
                : upper < 0.5
                  ? true
                  : lower < 0.5
                    ? false
                    : u > 0;

          if (light) plot(b.lit(), cx + dx, cy + dy, GOLD, a);
          else plot(b.dim(), cx + dx, cy + dy, EARTH, 0.9 * a);
        }
      }
    }

    const cx = place.x + bounds.x + bounds.w / 2;

    for (const [i, color] of [GOLD, CLAY, WHITE].entries()) {
      const angle = b.time * 1.3 + (i / 3) * Math.PI * 2;

      if (Math.sin(angle) > 0 !== front) continue;
      pixelGlint(
        b.lit(),
        cx + Math.cos(angle) * (bounds.w / 2 + 12),
        place.y + bounds.y + bounds.h * (0.2 + i * 0.3) + Math.sin(angle) * 4,
        2,
        WHITE,
        color,
        a,
      );
    }
  },

  sky(scene) {
    const { ctx, width, height, y, now, burst } = scene;
    const horizon = Math.round(y);
    const gap = burst < 0 ? 0 : gapAt(burst);

    if (gap > 1) {
      moveRect(scene, 0, 0, width, horizon, 0, -Math.round(gap / 2));
      moveRect(
        scene,
        0,
        horizon,
        width,
        height - horizon,
        0,
        Math.round(gap / 2),
      );
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#02020a";
      ctx.fillRect(0, horizon - gap / 2, width, gap);
      ctx.fillStyle = "#ffffff";

      scatter(now * 12, 0, width, gap, 22, 3, (sx, sy, p) => {
        ctx.globalAlpha = 0.4 + p * 0.6;
        ctx.fillRect(Math.round(sx), Math.round(horizon - gap / 2 + sy), 1, 1);
      });
    }

    const top = horizon - gap / 2;
    const bottom = horizon + gap / 2;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = rgba(GOLD, 1);
    ctx.fillRect(0, 0, width, top);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = rgba(EARTH, 1);
    ctx.fillRect(0, bottom, width, height - bottom);

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#ffffff";

    for (const edge of gap > 1 ? [top, bottom] : [horizon]) {
      ctx.globalAlpha = 0.22;
      ctx.fillRect(0, edge - 3, width, 6);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, edge, width, 1);
      ctx.fillRect(((now * 260) % (width + 200)) - 100, edge - 1, 60, 3);
    }

    if (burst < 0) return;

    for (const at of STROKES) {
      const since = (burst - at) / 0.14;

      if (since < 0 || since > 1) continue;
      const fade = (1 - since) ** 2;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 + fade * 10;
      ctx.beginPath();
      ctx.moveTo(-20, horizon - height * 0.12);
      ctx.lineTo(width + 20, horizon + height * 0.12);
      ctx.stroke();
      wash(scene, WHITE, 0.35 * fade, "lighter");
    }
  },
};
