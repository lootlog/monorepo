import { createSeededRandom, easeOutCubic } from "./replay-motion";
import type { ReplayScene } from "./replay-scene-layout";
import type { WarriorPoseMap } from "./replay-warrior-painter";

export type Point = { readonly x: number; readonly y: number };

const SPARK_LIFETIME_MS = 520;

export const getBodyPoint = (
  poses: WarriorPoseMap,
  id: string | null,
  scene: ReplayScene,
): Point | null => {
  const pose = id ? poses.get(id) : undefined;

  if (!pose) return null;

  return {
    x: pose.x,
    y: pose.feetY - scene.frameHeight * scene.spriteScale * 0.55,
  };
};

export const pixel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
};

export const paintSparks = (
  ctx: CanvasRenderingContext2D,
  seed: string,
  origin: Point,
  elapsedMs: number,
  count: number,
  colors: readonly string[],
  spread: number,
  gravity: number,
) => {
  if (elapsedMs < 0 || elapsedMs > SPARK_LIFETIME_MS) return;

  const random = createSeededRandom(seed);
  const life = elapsedMs / SPARK_LIFETIME_MS;

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const speed = spread * (0.45 + random() * 0.75);
    const size = random() > 0.7 ? 3 : 2;
    const color = colors[Math.floor(random() * colors.length)] ?? "#ffffff";
    const travel = easeOutCubic(life);

    ctx.globalAlpha = 1 - life ** 2;
    pixel(
      ctx,
      origin.x + Math.cos(angle) * speed * travel,
      origin.y + Math.sin(angle) * speed * travel + gravity * life * life,
      size,
      color,
    );
  }

  ctx.globalAlpha = 1;
};

export const paintRing = (
  ctx: CanvasRenderingContext2D,
  origin: Point,
  progress: number,
  color: string,
  maxRadius: number,
) => {
  const radius = 4 + maxRadius * easeOutCubic(progress);
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(origin.x, origin.y, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
};
