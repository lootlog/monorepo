import {
  REPLAY_IMPACT_FRACTION,
  type ReplayAttackEvent,
  type ReplayDamageKind,
  type ReplayEvent,
  type ReplayStateAtTime,
} from "@lootlog/battle-processor/replay-timeline";
import {
  clamp01,
  createSeededRandom,
  easeOutCubic,
  getEventProgress,
} from "./replay-motion";
import type { ReplayScene } from "./replay-scene-layout";
import type { WarriorPoseMap } from "./replay-warrior-painter";

export const DAMAGE_KIND_COLORS: Record<ReplayDamageKind, string> = {
  physical: "#fff4dc",
  distance: "#f1dfb0",
  auxiliary: "#d6c6ff",
  fire: "#ff8a2b",
  frost: "#7fd4ff",
  lightning: "#ffe14d",
  poison: "#7fdc5a",
  wound: "#e0453a",
  true: "#f39cff",
};

type Point = { readonly x: number; readonly y: number };

const SPARK_LIFETIME_MS = 520;

const getBodyPoint = (
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

const pixel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
};

const paintArrow = (
  ctx: CanvasRenderingContext2D,
  position: Point,
  angle: number,
) => {
  ctx.save();
  ctx.translate(Math.round(position.x), Math.round(position.y));
  ctx.rotate(angle);
  ctx.fillStyle = "#0b0705";
  ctx.fillRect(-9, -1.5, 15, 3);
  ctx.fillStyle = "#c79a5b";
  ctx.fillRect(-8, -0.5, 12, 1);
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(4, -1.5, 3, 3);
  ctx.fillStyle = "#f4ead8";
  ctx.fillRect(-9, -2, 2, 1);
  ctx.fillRect(-9, 1, 2, 1);
  ctx.restore();
};

const paintOrb = (
  ctx: CanvasRenderingContext2D,
  position: Point,
  from: Point,
  color: string,
  core: string,
  timeMs: number,
) => {
  const dx = position.x - from.x;
  const dy = position.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  for (let trail = 5; trail >= 1; trail -= 1) {
    const offset = trail * 3.5;
    const flicker = ((timeMs / 40 + trail) % 2) * 0.5;
    ctx.globalAlpha = (1 - trail / 6) * 0.8;
    pixel(
      ctx,
      position.x - (dx / length) * offset + flicker,
      position.y - (dy / length) * offset,
      Math.max(1, 5 - trail),
      color,
    );
  }

  ctx.globalAlpha = 1;
  pixel(ctx, position.x, position.y, 6, "#0b0705");
  pixel(ctx, position.x, position.y, 5, color);
  pixel(ctx, position.x, position.y, 2, core);
};

const paintLightning = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  seed: string,
  fade: number,
) => {
  const random = createSeededRandom(seed);
  const points: Point[] = [from];
  const segments = 7;

  for (let index = 1; index < segments; index += 1) {
    const t = index / segments;
    points.push({
      x: from.x + (to.x - from.x) * t + (random() - 0.5) * 18,
      y: from.y + (to.y - from.y) * t + (random() - 0.5) * 18,
    });
  }

  points.push(to);

  for (const [width, color] of [
    [4, "rgba(255, 225, 77, 0.35)"],
    [2, "#ffe14d"],
    [1, "#ffffff"],
  ] as const) {
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "miter";
    ctx.beginPath();

    for (const [index, point] of points.entries()) {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }

  ctx.globalAlpha = 1;
};

const PROJECTILE_START = 0.12;

const paintProjectile = (
  ctx: CanvasRenderingContext2D,
  event: ReplayAttackEvent,
  progress: number,
  from: Point,
  to: Point,
  timeMs: number,
) => {
  if (event.damageKind === "lightning") {
    if (progress < 0.32 || progress > REPLAY_IMPACT_FRACTION + 0.12) return;

    paintLightning(
      ctx,
      from,
      to,
      `${event.id}:${Math.floor(timeMs / 60)}`,
      progress > REPLAY_IMPACT_FRACTION ? 0.6 : 1,
    );

    return;
  }

  if (progress < PROJECTILE_START || progress >= REPLAY_IMPACT_FRACTION) return;

  const flight =
    (progress - PROJECTILE_START) / (REPLAY_IMPACT_FRACTION - PROJECTILE_START);

  const arc = Math.sin(flight * Math.PI) * -10;

  const position = {
    x: from.x + (to.x - from.x) * flight,
    y: from.y + (to.y - from.y) * flight + arc,
  };

  if (event.damageKind === "fire") {
    paintOrb(ctx, position, from, "#ff8a2b", "#fff1a8", timeMs);
  } else if (event.damageKind === "frost") {
    paintOrb(ctx, position, from, "#7fd4ff", "#ffffff", timeMs);
  } else if (event.damageKind === "poison") {
    paintOrb(ctx, position, from, "#7fdc5a", "#e6ffd0", timeMs);
  } else if (event.damageKind === "true" || event.damageKind === "auxiliary") {
    paintOrb(
      ctx,
      position,
      from,
      DAMAGE_KIND_COLORS[event.damageKind],
      "#ffffff",
      timeMs,
    );
  } else {
    const slope = Math.cos(flight * Math.PI) * -10;
    const angle = Math.atan2(to.y - from.y + slope, to.x - from.x);
    paintArrow(ctx, position, angle);
  }
};

const paintSparks = (
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

const paintSlash = (
  ctx: CanvasRenderingContext2D,
  origin: Point,
  reaction: number,
  isCrit: boolean,
) => {
  if (reaction > 0.45) return;

  const reach = (isCrit ? 15 : 11) * easeOutCubic(reaction / 0.45);
  const color = isCrit ? "#ffd24a" : "#ffffff";
  ctx.globalAlpha = 1 - reaction / 0.45;

  for (const offset of [-4, 0, 4]) {
    for (let step = -reach; step <= reach; step += 2) {
      pixel(ctx, origin.x + step, origin.y + step * 0.55 + offset, 2, color);
    }
  }

  ctx.globalAlpha = 1;
};

const paintRing = (
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

const getSparkColors = (event: ReplayAttackEvent) => {
  const color = DAMAGE_KIND_COLORS[event.damageKind];

  if (event.isBlock || event.isParry) return ["#cfe3ff", "#ffffff", "#8aa4c8"];

  return event.isCrit ? ["#ffd24a", "#ffffff", color] : [color, "#ffffff"];
};

const paintAttackEffect = (
  ctx: CanvasRenderingContext2D,
  event: ReplayAttackEvent,
  timeMs: number,
  poses: WarriorPoseMap,
  scene: ReplayScene,
) => {
  const from = getBodyPoint(poses, event.actorId, scene);
  const to = getBodyPoint(poses, event.targetId, scene);

  if (!from || !to) return;

  const duration = Math.max(1, event.tEnd - event.tStart);
  const isActive = timeMs <= event.tEnd;

  if (event.isRanged && isActive) {
    paintProjectile(
      ctx,
      event,
      getEventProgress(event, timeMs),
      from,
      to,
      timeMs,
    );
  }

  const sinceImpact =
    timeMs - (event.tStart + duration * REPLAY_IMPACT_FRACTION);

  if (sinceImpact < 0 || event.isEvade) return;

  if (!event.isRanged && isActive) {
    paintSlash(ctx, to, sinceImpact / (duration * 0.55), event.isCrit);
  }

  paintSparks(
    ctx,
    event.id,
    to,
    sinceImpact,
    event.isCrit ? 18 : 9,
    getSparkColors(event),
    event.isCrit ? 26 : 16,
    14,
  );
};

const paintRestoreEffect = (
  ctx: CanvasRenderingContext2D,
  seed: string,
  target: Point,
  elapsedMs: number,
  color: string,
) => {
  const random = createSeededRandom(seed);

  for (let index = 0; index < 8; index += 1) {
    const life = clamp01((elapsedMs - index * 40) / 700);

    if (life <= 0 || life >= 1) continue;

    ctx.globalAlpha = 1 - life;
    pixel(
      ctx,
      target.x + (random() - 0.5) * 22,
      target.y + 10 - life * 30 - random() * 6,
      index % 3 === 0 ? 3 : 2,
      index % 2 === 0 ? color : "#ffffff",
    );
  }

  ctx.globalAlpha = 1;
};

const paintLegendaryEffect = (
  ctx: CanvasRenderingContext2D,
  seed: string,
  origin: Point,
  elapsedMs: number,
) => {
  const ringProgress = clamp01(elapsedMs / 700);

  if (ringProgress < 1) {
    paintRing(ctx, origin, ringProgress, "#ffd24a", 30);
    paintRing(ctx, origin, clamp01(ringProgress * 1.4), "#fff4c2", 20);
  }

  paintSparks(
    ctx,
    `${seed}:legend`,
    origin,
    elapsedMs,
    14,
    ["#ffd24a", "#fff4c2", "#ff9f1c"],
    28,
    -6,
  );
};

const paintEventEffect = (
  ctx: CanvasRenderingContext2D,
  event: ReplayEvent,
  timeMs: number,
  poses: WarriorPoseMap,
  scene: ReplayScene,
) => {
  const elapsedMs = timeMs - event.tStart;

  switch (event.kind) {
    case "attack":
      paintAttackEffect(ctx, event, timeMs, poses, scene);

      break;
    case "heal":
    case "shield": {
      const target = getBodyPoint(poses, event.targetId, scene);
      const color = event.kind === "heal" ? "#6ff07a" : "#7fd4ff";

      if (target) paintRestoreEffect(ctx, event.id, target, elapsedMs, color);

      break;
    }

    case "legendary_proc": {
      const origin = getBodyPoint(poses, event.actorId, scene);

      if (origin) paintLegendaryEffect(ctx, event.id, origin, elapsedMs);

      break;
    }

    case "dot": {
      const target = getBodyPoint(poses, event.targetId, scene);
      const colors = [DAMAGE_KIND_COLORS[event.damageKind], "#0b0705"];

      if (target) {
        paintSparks(ctx, event.id, target, elapsedMs, 6, colors, 12, -10);
      }

      break;
    }

    case "death": {
      const pose = poses.get(event.victimId);
      const colors = ["#6b6460", "#9a918a", "#3b3532"];

      if (pose) {
        const origin = { x: pose.x, y: pose.feetY - 8 };
        paintSparks(ctx, event.id, origin, elapsedMs, 16, colors, 22, -12);
      }

      break;
    }

    default:
      break;
  }
};

export const paintCombatEffects = (
  ctx: CanvasRenderingContext2D,
  state: ReplayStateAtTime,
  poses: WarriorPoseMap,
  scene: ReplayScene,
) => {
  for (const event of state.recentEvents) {
    paintEventEffect(ctx, event, state.timeMs, poses, scene);
  }
};

export const getCameraImpact = (
  state: ReplayStateAtTime,
  reducedMotion: boolean,
) => {
  let shake = 0;
  let flash = 0;

  for (const event of state.activeEvents) {
    const duration = Math.max(1, event.tEnd - event.tStart);

    if (event.kind === "attack" && event.isCrit && !event.isEvade) {
      const since =
        (state.timeMs - event.tStart) / duration - REPLAY_IMPACT_FRACTION;

      if (since >= 0 && since < 0.3) {
        const decay = 1 - since / 0.3;
        shake = Math.max(shake, (event.isHighlight ? 4 : 2.5) * decay);
        flash = Math.max(flash, (event.isHighlight ? 0.22 : 0.1) * decay);
      }
    }

    if (event.kind === "death") {
      const since = (state.timeMs - event.tStart) / duration;

      if (since < 0.35) shake = Math.max(shake, 3 * (1 - since / 0.35));
    }
  }

  if (reducedMotion || shake < 0.2)
    return { x: 0, y: 0, flash: reducedMotion ? 0 : flash };

  return {
    x: Math.round(Math.sin(state.timeMs * 0.09) * shake),
    y: Math.round(Math.cos(state.timeMs * 0.13) * shake * 0.6),
    flash,
  };
};
