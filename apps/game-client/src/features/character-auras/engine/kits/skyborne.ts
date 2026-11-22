import { sprite } from "../decor";
import { ramp, rgba, type Rgb } from "../math";
import { pixelGlint } from "../paint";
import { context2d, createCanvas } from "../silhouette";
import { wash, wrap } from "../sky";
import { span, type AuraKit } from "./kit";

const DAY = 67;

const WHITE: Rgb = [255, 255, 255];

const LIGHT: readonly Rgb[] = [
  [255, 170, 150],
  [210, 232, 255],
  [210, 232, 255],
  [255, 140, 60],
  [8, 10, 44],
  [8, 10, 44],
  [255, 170, 150],
];

const LIGHT_ALPHA = [0.16, 0.05, 0.05, 0.2, 0.5, 0.5, 0.16] as const;

const PUFF = ["  ####  ", " ###### ", "########", " ###### "];

const CLOUD_W = 260;

const CLOUD_H = 100;

const cloudSprites: (HTMLCanvasElement | undefined)[] = [];

function cloud(shadow: boolean): HTMLCanvasElement {
  const cached = cloudSprites[shadow ? 1 : 0];

  if (cached) return cached;
  const tone = shadow ? "8,12,30" : "255,255,255";
  const canvas = createCanvas(CLOUD_W, CLOUD_H);
  const ctx = context2d(canvas);

  for (const [x, y, r] of [
    [70, 60, 44],
    [125, 46, 46],
    [185, 60, 40],
    [130, 68, 60],
  ] as const) {
    const lobe = ctx.createRadialGradient(x, y, 0, x, y, r);
    lobe.addColorStop(0, `rgba(${tone},0.9)`);
    lobe.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = lobe;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  cloudSprites[shadow ? 1 : 0] = canvas;

  return canvas;
}

function dayAt(time: number): number {
  return (time % DAY) / DAY;
}

export const skyborne: AuraKit = {
  gloom: 0.2,
  veil: [8, 10, 44],
  burst: { length: 2.4, release: 0.3 },

  pieces(b, place, front, burst) {
    const a = b.intensity;
    const x = Math.round(place.feetX);
    const y = Math.round(place.feetY) - 1;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.4;

      if (Math.sin(angle) > 0 !== front) continue;
      const bob = Math.round(Math.sin(b.time * 1.3 + i * 2) * 1.5);
      sprite(
        b.dim(),
        x + Math.cos(angle) * 19,
        y + Math.sin(angle) * 6 + bob,
        PUFF,
        { "#": i % 2 ? [226, 236, 250] : WHITE },
        0.95 * a,
      );
    }

    if (front) return;
    const day = dayAt(b.time);
    const night = day > 0.6;
    const along = night ? (day - 0.6) / 0.4 : day / 0.6;
    const { head } = place.silhouette;
    const orbX = place.x + head.x + (along - 0.5) * 44;
    const orbY = place.y + head.y - 12 - Math.sin(along * Math.PI) * 12;
    pixelGlint(
      b.lit(),
      orbX,
      orbY,
      night ? 2 : 3 + Math.round(span(burst, 0.3, 0.5) * 3),
      WHITE,
      night ? [190, 206, 255] : [255, 214, 90],
      a,
    );
  },

  sky(scene) {
    const { ctx, width, height, now, view, burst, x, y } = scene;
    const day = dayAt(now);
    const at = day * (LIGHT.length - 1);
    const from = Math.floor(at);

    const alpha =
      (LIGHT_ALPHA[from] ?? 0) +
      ((LIGHT_ALPHA[from + 1] ?? 0) - (LIGHT_ALPHA[from] ?? 0)) * (at - from);

    wash(scene, ramp(LIGHT, day), alpha);

    ctx.globalCompositeOperation = "source-over";

    for (let i = 0; i < 9; i++) {
      const shadow = i % 3 === 0;
      const depth = shadow ? 1 : 0.6;

      const cx = wrap(
        i * 331 + now * (shadow ? 9 : 16) - view[0] * depth,
        width + CLOUD_W * 2,
      );

      const cy = wrap(i * 197 - view[1] * depth, height + CLOUD_H * 2);
      ctx.globalAlpha = shadow ? 0.3 : 0.34;
      ctx.drawImage(cloud(shadow), cx - CLOUD_W, cy - CLOUD_H);
    }

    const night = day > 0.6;
    const along = night ? (day - 0.6) / 0.4 : day / 0.6;
    const orbX = width * (0.08 + along * 0.84);
    const orbY = height * 0.3 - Math.sin(along * Math.PI) * height * 0.2;
    ctx.globalCompositeOperation = "lighter";

    for (const [radius, a] of [
      [46, 0.12],
      [28, 0.25],
      [16, 1],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.fillStyle = night ? "#cfdcff" : "#ffe08a";
      ctx.beginPath();
      ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const open = span(burst, 0.3, 1);

    if (burst < 0.3) return;
    const fade = (1 - open) ** 1.5;

    for (const [half, a] of [
      [70, 0.14],
      [40, 0.2],
      [16, 0.5],
    ] as const) {
      ctx.globalAlpha = a * fade;
      ctx.fillStyle = rgba([255, 240, 190], 1);
      ctx.fillRect(x - half, 0, half * 2, y + 30);
    }

    wash(scene, [255, 244, 210], 0.35 * (1 - open) ** 4, "lighter");
  },
};
