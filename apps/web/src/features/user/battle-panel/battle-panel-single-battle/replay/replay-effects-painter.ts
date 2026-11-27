import type {
  ReplayAttackEvent,
  ReplayDamageKind,
  ReplayLegendaryProcEvent,
  ReplayStateAtTime,
} from "@lootlog/battle-processor/replay-timeline";
import { BATTLE_HEX_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import type { ReplayAnchor } from "./replay-canvas-types";
import {
  paintCrescentSlash,
  paintDefenseVfx,
  paintFireExplosion,
  paintFrostSpikeBurst,
  paintProjectile,
  paintStarFlare,
} from "./replay-projectile-painter";

const DAMAGE_COLORS: Record<ReplayDamageKind, string> = {
  physical: "#f8fafc",
  distance: "#86efac",
  auxiliary: "#fdba74",
  fire: "#ff6b35",
  frost: "#38bdf8",
  lightning: "#fde047",
  poison: "#4ade80",
  wound: "#fb923c",
  true: "#e879f9",
};

const LEGENDARY_COLORS: Record<
  ReplayLegendaryProcEvent["legendaryKind"],
  string
> = {
  anguish: BATTLE_HEX_COLORS.legendary.anguish,
  cleanse: BATTLE_HEX_COLORS.legendary.cleanse,
  critShield: BATTLE_HEX_COLORS.legendary.critShield,
  curse: BATTLE_HEX_COLORS.legendary.curse,
  facade: BATTLE_HEX_COLORS.legendary.facade,
  frenzy: BATTLE_HEX_COLORS.legendary.frenzy,
  glare: BATTLE_HEX_COLORS.legendary.glare,
  holyTouch: BATTLE_HEX_COLORS.legendary.holyTouch,
  lastHeal: BATTLE_HEX_COLORS.legendary.lastHeal,
  puncture: BATTLE_HEX_COLORS.legendary.puncture,
  retaliation: BATTLE_HEX_COLORS.legendary.retaliation,
  unknown: BATTLE_HEX_COLORS.legendary.unknown,
  veryCrit: BATTLE_HEX_COLORS.legendary.veryCrit,
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const hashId = (id: string): number => {
  let hash = 2166136261;

  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const paintEnergyBurst = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  progress: number,
  color: string,
  count: number,
  maxRadius: number,
  doubleRing: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha = 1 - progress;
  const easeOut = 1 - (1 - progress) ** 3;

  paintStarFlare(
    ctx,
    x,
    y,
    maxRadius * (0.48 + progress * 0.5),
    color,
    Math.max(0, 1 - progress * 2.1),
  );

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (doubleRing) {
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + 24,
      maxRadius * 0.96 * easeOut,
      maxRadius * 0.36 * easeOut,
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = Math.max(1.5, 5.5 * alpha);
    ctx.stroke();

    const innerEase = 1 - (1 - clamp01(progress * 1.35)) ** 3;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + 24,
      maxRadius * 0.62 * innerEase,
      maxRadius * 0.22 * innerEase,
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = alpha * 0.65;
    ctx.lineWidth = Math.max(1, 3 * alpha);
    ctx.stroke();
  }

  ctx.lineCap = "round";

  for (let i = 0; i < count; i += 1) {
    const angleSeed = ((seed + i * 2654435761) >>> 0) % 3600;
    const speedSeed = ((seed + i * 1597334677) >>> 0) % 1000;
    const angle = (angleSeed / 3600) * Math.PI * 2;
    const speed = 0.42 + (speedSeed / 1000) * 0.95;
    const headDist = maxRadius * speed * easeOut;

    const tailDist = Math.max(
      0,
      headDist - (18 + (i % 3) * 10) * (1 - progress * 0.55),
    );

    const gravity = progress * progress * 22;

    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(angle) * tailDist,
      y + Math.sin(angle) * tailDist + gravity,
    );
    ctx.lineTo(
      x + Math.cos(angle) * headDist,
      y + Math.sin(angle) * headDist + gravity,
    );
    ctx.strokeStyle = i % 3 === 0 ? "#ffffff" : color;
    ctx.lineWidth = Math.max(1.4, (3.6 - (i % 2)) * (1 - progress * 0.45));
    ctx.globalAlpha = alpha * 0.95;
    ctx.stroke();
  }

  ctx.restore();
};

const paintHealLightPillar = (
  ctx: CanvasRenderingContext2D,
  target: ReplayAnchor,
  seed: number,
  progress: number,
  isLastHeal: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha =
    progress < 0.22 ? progress / 0.22 : 1 - (progress - 0.22) / 0.78;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha);

  const beamW = (isLastHeal ? 116 : 64) * (1 - progress * 0.24);

  const beamGrad = ctx.createLinearGradient(
    0,
    target.y - 280,
    0,
    target.y + 44,
  );

  beamGrad.addColorStop(0, "rgba(254, 240, 138, 0)");
  beamGrad.addColorStop(
    0.52,
    isLastHeal ? "rgba(250, 204, 21, 0.56)" : "rgba(74, 222, 128, 0.34)",
  );
  beamGrad.addColorStop(1, "rgba(74, 222, 128, 0.65)");
  ctx.fillStyle = beamGrad;
  ctx.fillRect(target.x - beamW / 2, target.y - 280, beamW, 324);

  ctx.strokeStyle = isLastHeal ? "#fef08a" : "#86efac";
  ctx.lineWidth = 2.5;

  for (const phase of [0, Math.PI]) {
    ctx.beginPath();

    for (let s = 0; s <= 18; s += 1) {
      const f = s / 18;

      const hx =
        target.x + Math.sin(f * Math.PI * 3 + progress * 8 + phase) * 34;

      const hy = target.y + 38 - f * 130;

      if (s === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }

    ctx.stroke();
  }

  for (let i = 0; i < (isLastHeal ? 12 : 7); i += 1) {
    const ox = ((seed + i * 317) % 82) - 41;
    const oy = 26 - progress * 100 - ((seed + i * 193) % 28);
    const cx = target.x + ox;
    const cy = target.y + oy;
    const color = isLastHeal && i % 2 === 0 ? "#fef08a" : "#4ade80";

    const orb = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
    orb.addColorStop(0, "#ffffff");
    orb.addColorStop(0.45, color);
    orb.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const paintShieldDome = (
  ctx: CanvasRenderingContext2D,
  target: ReplayAnchor,
  progress: number,
  isMagic: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha =
    progress < 0.25 ? progress / 0.25 : 1 - (progress - 0.25) / 0.75;

  const color = isMagic ? "#38bdf8" : "#93c5fd";
  const rad = 58 * target.scale * (0.86 + progress * 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha) * 0.92;

  const dome = ctx.createRadialGradient(
    target.x,
    target.y,
    rad * 0.3,
    target.x,
    target.y,
    rad,
  );

  dome.addColorStop(0, "rgba(56, 189, 248, 0.04)");
  dome.addColorStop(
    0.78,
    isMagic ? "rgba(56, 189, 248, 0.42)" : "rgba(148, 163, 184, 0.34)",
  );
  dome.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(target.x, target.y, rad, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(target.x, target.y, rad * 0.88, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
};

const paintLegendaryAura = (
  ctx: CanvasRenderingContext2D,
  actor: ReplayAnchor,
  seed: number,
  progress: number,
  color: string,
): void => {
  paintEnergyBurst(
    ctx,
    actor.x,
    actor.y - 8,
    seed,
    progress,
    color,
    26,
    128,
    true,
  );

  const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha) * 0.85;
  const beamW = 86 * (1 - progress * 0.2);
  const grad = ctx.createLinearGradient(0, actor.y - 260, 0, actor.y + 44);
  grad.addColorStop(0, "rgba(255, 255, 255, 0)");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(actor.x - beamW / 2, actor.y - 260, beamW, 304);
  ctx.restore();
};

const paintAttackEventEffects = (
  ctx: CanvasRenderingContext2D,
  event: ReplayAttackEvent,
  anchors: ReadonlyMap<string, ReplayAnchor>,
  progress: number,
  seed: number,
): void => {
  const from = anchors.get(event.actorId);
  const to = anchors.get(event.targetId);

  if (!from || !to) return;

  if (event.isRanged) {
    paintProjectile(ctx, event, from, to, progress, seed);
  }

  if (progress < 0.38) return;

  const impactProgress = clamp01((progress - 0.38) / 0.62);

  if (event.isEvade || event.isParry || event.isBlock || event.isArrowBlock) {
    paintDefenseVfx(ctx, event, to, impactProgress);
  }

  if (event.isEvade) return;

  if (!event.isRanged) {
    paintCrescentSlash(
      ctx,
      to.x,
      to.y - 6,
      impactProgress,
      event.isCrit,
      event.isVeryCrit,
    );
  } else if (event.damageKind === "fire") {
    paintFireExplosion(ctx, to.x, to.y - 6, impactProgress, event.isCrit);
  } else if (event.damageKind === "frost") {
    paintFrostSpikeBurst(ctx, to.x, to.y - 6, impactProgress, event.isCrit);
  }

  const color = event.isVeryCrit
    ? "#ff3d68"
    : event.isCrit
      ? "#fbbf24"
      : DAMAGE_COLORS[event.damageKind];

  paintEnergyBurst(
    ctx,
    to.x,
    to.y - 6,
    seed,
    impactProgress,
    color,
    event.isCrit ? 24 : 13,
    event.isCrit ? 112 : 64,
    event.isCrit || event.damageKind === "fire" || event.damageKind === "frost",
  );
};

export const paintActiveProjectilesAndParticles = (
  ctx: CanvasRenderingContext2D,
  state: ReplayStateAtTime,
  anchors: ReadonlyMap<string, ReplayAnchor>,
  reducedMotion: boolean,
): void => {
  if (reducedMotion) return;

  for (const event of state.activeEvents) {
    const duration = Math.max(1, event.tEnd - event.tStart);
    const progress = clamp01((state.timeMs - event.tStart) / duration);
    const seed = hashId(event.id);

    if (event.kind === "attack") {
      paintAttackEventEffects(ctx, event, anchors, progress, seed);
      continue;
    }

    if (event.kind === "heal") {
      const target = anchors.get(event.targetId);

      if (target) {
        paintHealLightPillar(ctx, target, seed, progress, event.isLastHeal);
      }

      continue;
    }

    if (event.kind === "shield") {
      const target = anchors.get(event.targetId);

      if (target) {
        paintShieldDome(ctx, target, progress, event.isMagic);
      }

      continue;
    }

    if (event.kind === "dot") {
      const target = anchors.get(event.targetId);

      if (target) {
        paintEnergyBurst(
          ctx,
          target.x,
          target.y,
          seed,
          progress,
          DAMAGE_COLORS[event.damageKind],
          10,
          48,
          false,
        );
      }

      continue;
    }

    if (event.kind === "step") {
      const actor = anchors.get(event.actorId);

      if (actor) {
        paintEnergyBurst(
          ctx,
          actor.x,
          actor.y + 24,
          seed,
          progress,
          "#cbd5e1",
          6,
          36,
          false,
        );
      }

      continue;
    }

    if (event.kind === "legendary_proc") {
      const actor = anchors.get(event.actorId);

      if (actor) {
        paintLegendaryAura(
          ctx,
          actor,
          seed,
          progress,
          LEGENDARY_COLORS[event.legendaryKind],
        );
      }

      continue;
    }

    if (event.kind === "death") {
      const victim = anchors.get(event.victimId);

      if (victim) {
        paintEnergyBurst(
          ctx,
          victim.x,
          victim.y,
          seed,
          progress,
          "#fb7185",
          30,
          136,
          true,
        );
      }
    }
  }
};
