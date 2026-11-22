import { hasGraphicsAcceleration } from "../map-aura-mode";
import { rgba, TAU } from "./math";
import { scatter, wash, type MapScene } from "./sky";

const SEAL_RADIUS = 250;

const SEAL_SQUASH = 0.55;

const SHIFT_LENGTH = 0.7;

const BEAMS = 7;

const COMETS = 3;

const TAIL = 9;

const TAIL_STEP = 0.07;

export function drawDominion(scene: MapScene, shifted: number): void {
  const { ctx, width, height, x, y, feetY, now, view, light, mid } = scene;
  const shift = shifted < SHIFT_LENGTH ? 1 - shifted / SHIFT_LENGTH : 0;
  const breath = 0.8 + 0.2 * Math.sin(now * 1.3);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  if (hasGraphicsAcceleration()) {
    ctx.fillStyle = rgba(light, 1);

    for (let i = 0; i < BEAMS; i++) {
      const lean =
        ((i + 0.5) / BEAMS - 0.5) * 1.5 + Math.sin(now * 0.4 + i * 1.9) * 0.08;

      const half = 0.035 + 0.02 * Math.sin(now * 0.9 + i * 2.3);
      const reach = y + 40;
      ctx.globalAlpha =
        (0.05 + 0.03 * Math.sin(now * 0.7 + i)) * (1 + shift * 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.tan(lean - half) * reach, y - reach);
      ctx.lineTo(x + Math.tan(lean + half) * reach, y - reach);
      ctx.closePath();
      ctx.fill();
    }
  }

  const radius = SEAL_RADIUS * (1 - shift * shift * 0.35);
  const turn = now * 0.1;

  const at = (angle: number, reach: number): [number, number] => [
    x + Math.cos(angle) * radius * reach,
    feetY + Math.sin(angle) * radius * SEAL_SQUASH * reach,
  ];

  const ring = (reach: number) => {
    ctx.moveTo(x + radius * reach, feetY);
    ctx.ellipse(
      x,
      feetY,
      radius * reach,
      radius * SEAL_SQUASH * reach,
      0,
      0,
      TAU,
    );
  };

  ctx.strokeStyle = rgba(mid, 1);
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.12 * breath + shift * 0.3;
  ctx.beginPath();
  ring(1);
  ctx.stroke();

  ctx.strokeStyle = rgba(light, 1);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3 * breath + shift * 0.5;
  ctx.beginPath();
  ring(1);
  ring(0.93);
  ring(0.56);

  for (let i = 0; i < 12; i++) {
    const angle = turn + (i / 12) * TAU;
    ctx.moveTo(...at(angle, 0.93));
    ctx.lineTo(...at(angle + (5 / 12) * TAU, 0.93));
    ctx.moveTo(...at(angle + TAU / 24, 0.93));
    ctx.lineTo(...at(angle + TAU / 24, 1));
  }

  for (let i = 0; i < 6; i++) {
    const angle = -turn * 1.7 + (i / 6) * TAU;
    ctx.moveTo(...at(angle, 0.56));
    ctx.lineTo(...at(angle + TAU / 6, 0.56));
    const [cx, cy] = at(angle, 0.56);
    ctx.moveTo(cx + 9, cy);
    ctx.ellipse(cx, cy, 9, 9 * SEAL_SQUASH, 0, 0, TAU);
  }

  ctx.stroke();

  for (let i = 0; i < COMETS; i++) {
    const head = now * 0.8 + (i / COMETS) * TAU;
    const reach = 1.08 + 0.07 * Math.sin(now * 0.6 + i * 2);

    for (let k = 0; k < TAIL; k++) {
      ctx.globalAlpha = (1 - k / TAIL) ** 1.5;
      ctx.lineWidth = k < 2 ? 3 : k < 5 ? 2 : 1;
      ctx.strokeStyle = rgba(k < 3 ? light : mid, 1);
      ctx.beginPath();
      ctx.moveTo(...at(head - k * TAIL_STEP, reach));
      ctx.lineTo(...at(head - (k + 1) * TAIL_STEP, reach));
      ctx.stroke();
    }

    const [hx, hy] = at(head, reach);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3);
  }

  ctx.fillStyle = rgba(light, 1);

  scatter(
    view[0],
    view[1] + now * 34,
    width,
    height,
    66,
    71,
    (px, py, p, q) => {
      ctx.globalAlpha =
        (0.35 + q * 0.55) * (0.6 + 0.4 * Math.sin(now * (2 + p * 3) + q * 50));
      const size = q > 0.75 ? 2 : 1;
      ctx.fillRect(
        Math.round(px + Math.sin(now + p * 20) * 6),
        Math.round(py),
        size,
        size,
      );
    },
  );

  if (shift <= 0) return;
  wash(scene, light, 0.4 * shift ** 2, "lighter");
}
