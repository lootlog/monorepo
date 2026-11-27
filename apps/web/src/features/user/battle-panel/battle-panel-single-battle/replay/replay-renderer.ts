import {
  getReplayStateAtTime,
  type ReplayAttackEvent,
  type ReplayLayout,
  type ReplayParticipant,
  type ReplayStateAtTime,
  type ReplayStatusTag,
  type ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import {
  getArenaPlayfieldBounds,
  paintArenaBackground,
  traceChamferedRect,
  traceRoundedRect,
} from "./replay-arena-painter";
import type {
  ReplayAnchor,
  ReplayLoadedSprite,
  ReplayRenderOptions,
} from "./replay-canvas-types";
import { paintActiveProjectilesAndParticles } from "./replay-effects-painter";
import { paintFloatingCombatTextAndBanners } from "./replay-floating-text-painter";
import { paintArenaHud } from "./replay-hud-painter";
import { paintVictoryOverlay } from "./replay-victory-painter";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const PROFESSION_COLORS = new Map<string, string>([
  ["w", "#ef4444"],
  ["p", "#f59e0b"],
  ["b", "#c084fc"],
  ["h", "#22c55e"],
  ["t", "#14b8a6"],
  ["m", "#38bdf8"],
]);

const STATUS_BADGE_STYLE: Record<
  ReplayStatusTag,
  { color: string; glyph: string }
> = {
  stun: { color: "#c084fc", glyph: "★" },
  freeze: { color: "#38bdf8", glyph: "❄" },
  poison: { color: "#4ade80", glyph: "☠" },
  wound: { color: "#fb923c", glyph: "🩸" },
  burn: { color: "#ff6b4a", glyph: "🔥" },
};

const computeParticipantAnchors = (
  participants: readonly ReplayParticipant[],
  rowById: Record<string, number>,
  width: number,
  height: number,
  layout: ReplayLayout,
): Map<string, ReplayAnchor> => {
  const anchors = new Map<string, ReplayAnchor>();
  const isVertical = layout === "9:16";
  const bounds = getArenaPlayfieldBounds(width, height, layout);
  const rowHeight = bounds.height / 6;

  for (const participant of participants) {
    const count = Math.max(1, participant.teamSize);
    const idx = participant.slotIndex;
    const defaultRow = participant.side === "left" ? 3 : 2;
    const row = Math.max(0, Math.min(5, rowById[participant.id] ?? defaultRow));
    const y = bounds.top + (row + 0.44) * rowHeight;

    const maxSpread = isVertical
      ? bounds.width * 0.74
      : Math.min(bounds.width * 0.74, count * 215);

    const xStep = count > 1 ? maxSpread / (count - 1) : 0;

    const x =
      count === 1 ? width * 0.5 : width * 0.5 - maxSpread / 2 + idx * xStep;

    const scale = isVertical
      ? count === 1
        ? 1.72
        : count <= 3
          ? 1.36
          : 1.04
      : count === 1
        ? 1.15
        : count <= 3
          ? 1.02
          : 0.88;

    anchors.set(participant.id, { x, y, scale });
  }

  return anchors;
};

type MotionState = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly hitFlash: number;
  readonly isActing: boolean;
  readonly isLunging: boolean;
  readonly animFrame: number;
};

const computeAttackActorOffset = (
  event: ReplayAttackEvent,
  selfAnchor: ReplayAnchor,
  targetAnchor: ReplayAnchor | undefined,
  progress: number,
) => {
  if (!targetAnchor) return { dx: 0, dy: 0 };

  if (!event.isRanged) {
    const lungePhase =
      progress < 0.45
        ? 1 - (1 - progress / 0.45) ** 3
        : Math.max(0, 1 - (progress - 0.45) / 0.55);

    return {
      dx: (targetAnchor.x - selfAnchor.x) * 0.48 * lungePhase,
      dy: (targetAnchor.y - selfAnchor.y) * 0.48 * lungePhase,
    };
  }

  const castRecoil = Math.sin(clamp01(progress / 0.45) * Math.PI);
  const dirY = Math.sign(selfAnchor.y - targetAnchor.y) || 1;

  return { dx: 0, dy: dirY * 11 * castRecoil };
};

const computeAttackTargetReaction = (
  event: ReplayAttackEvent,
  selfAnchor: ReplayAnchor,
  actorAnchor: ReplayAnchor | undefined,
  progress: number,
) => {
  if (progress < 0.4) return { dx: 0, dy: 0, flash: 0 };

  const impactProgress = clamp01((progress - 0.4) / 0.44);
  const dirX = actorAnchor ? Math.sign(selfAnchor.x - actorAnchor.x) : 0;
  const dirY = actorAnchor ? Math.sign(selfAnchor.y - actorAnchor.y) || 1 : 1;
  const wave = Math.sin(impactProgress * Math.PI);

  if (event.isEvade) {
    return { dx: (dirX || 1) * 24 * wave, dy: 0, flash: 0 };
  }

  const strength = event.isCrit ? 18 : 9;

  return {
    dx: dirX * strength * 0.45 * wave,
    dy: dirY * strength * wave,
    flash: wave * (event.isCrit ? 0.8 : 0.48),
  };
};

const computeParticipantMotion = (
  participant: ReplayParticipant,
  state: ReplayStateAtTime,
  anchors: ReadonlyMap<string, ReplayAnchor>,
  rowStepPx: number,
  reducedMotion: boolean,
): MotionState => {
  const selfAnchor = anchors.get(participant.id);

  if (!selfAnchor || reducedMotion) {
    return {
      offsetX: 0,
      offsetY: 0,
      hitFlash: 0,
      isActing: false,
      isLunging: false,
      animFrame: 0,
    };
  }

  let offsetX = 0;
  let offsetY = 0;
  let hitFlash = 0;
  let isActing = false;
  let isLunging = false;

  for (const event of state.activeEvents) {
    const duration = Math.max(1, event.tEnd - event.tStart);
    const progress = clamp01((state.timeMs - event.tStart) / duration);

    if (event.kind === "attack") {
      if (event.actorId === participant.id) {
        isActing = true;

        if (!event.isRanged) isLunging = true;

        const actorOffset = computeAttackActorOffset(
          event,
          selfAnchor,
          anchors.get(event.targetId),
          progress,
        );

        offsetX += actorOffset.dx;
        offsetY += actorOffset.dy;
      }

      if (event.targetId === participant.id) {
        const reaction = computeAttackTargetReaction(
          event,
          selfAnchor,
          anchors.get(event.actorId),
          progress,
        );

        offsetX += reaction.dx;
        offsetY += reaction.dy;
        hitFlash = Math.max(hitFlash, reaction.flash);
      }

      continue;
    }

    if (event.kind === "step" && event.actorId === participant.id) {
      isActing = true;
      const stepDir = participant.side === "left" ? -1 : 1;
      offsetY += stepDir * rowStepPx * progress;
    }
  }

  const animFrame = isActing ? Math.floor(state.timeMs / 90) % 4 : 0;

  return { offsetX, offsetY, hitFlash, isActing, isLunging, animFrame };
};

const computeScreenShake = (
  state: ReplayStateAtTime,
  reducedMotion: boolean,
) => {
  if (reducedMotion) return { x: 0, y: 0 };

  let magnitude = 0;

  for (const event of state.activeEvents) {
    if (!event.isHighlight) continue;

    if (event.kind !== "attack" && event.kind !== "death") continue;

    const duration = Math.max(1, event.tEnd - event.tStart);
    const progress = clamp01((state.timeMs - event.tStart) / duration);
    const start = event.kind === "attack" ? 0.4 : 0;

    if (progress < start) continue;

    const shakeProgress = clamp01((progress - start) / 0.36);
    const decay = 1 - shakeProgress;

    magnitude = Math.max(
      magnitude,
      decay * (event.kind === "death" ? 13 : 9.5),
    );
  }

  if (magnitude <= 0.1) return { x: 0, y: 0 };

  return {
    x: Math.sin(state.timeMs * 0.088) * magnitude,
    y: Math.cos(state.timeMs * 0.118) * magnitude * 0.72,
  };
};

const drawUnitPedestal = (
  ctx: CanvasRenderingContext2D,
  participant: ReplayParticipant,
  targetW: number,
  targetH: number,
  isActing: boolean,
  isDead: boolean,
  timeMs: number,
): void => {
  const footY = targetH * 0.42;
  const rx = targetW * 0.64;
  const ry = targetH * 0.16;

  if (!isDead) {
    const auraColor = isActing
      ? "rgba(250, 204, 21, 0.42)"
      : participant.side === "left"
        ? "rgba(74, 222, 128, 0.2)"
        : "rgba(251, 113, 133, 0.2)";

    const ringStroke = isActing
      ? "rgba(254, 240, 138, 0.94)"
      : participant.side === "left"
        ? "rgba(74, 222, 128, 0.48)"
        : "rgba(251, 113, 133, 0.48)";

    const glow = ctx.createRadialGradient(0, footY, 4, 0, footY, rx * 1.3);
    glow.addColorStop(0, auraColor);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, footY, rx * 1.32, ry * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, footY, rx * 0.92, ry * 0.96, 0, 0, Math.PI * 2);
    ctx.lineWidth = isActing ? 2.6 : 1.4;
    ctx.strokeStyle = ringStroke;
    ctx.stroke();

    if (isActing) {
      const spin = timeMs * 0.004;
      ctx.beginPath();
      ctx.ellipse(
        0,
        footY,
        rx * 1.12,
        ry * 1.16,
        0,
        spin,
        spin + Math.PI * 0.65,
      );
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.ellipse(0, footY, targetW * 0.48, targetH * 0.11, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.fill();
};

const drawSpriteFrame = (
  ctx: CanvasRenderingContext2D,
  participant: ReplayParticipant,
  sprite: ReplayLoadedSprite,
  targetW: number,
  targetH: number,
  animFrame: number,
): void => {
  ctx.imageSmoothingEnabled = sprite.frameWidth >= 64;

  if (sprite.isSheet) {
    const directionRow = participant.side === "left" ? 3 : 0;
    const sx = animFrame * sprite.frameWidth;
    const sy = directionRow * sprite.frameHeight;

    ctx.drawImage(
      sprite.image,
      sx,
      sy,
      sprite.frameWidth,
      sprite.frameHeight,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH,
    );

    return;
  }

  const aspect = sprite.frameWidth / Math.max(1, sprite.frameHeight);
  const drawH = targetH;
  const drawW = Math.min(targetW * 1.65, drawH * aspect);
  ctx.drawImage(sprite.image, -drawW / 2, -drawH / 2, drawW, drawH);
};

const drawParticipantSprite = (
  ctx: CanvasRenderingContext2D,
  participant: ReplayParticipant,
  sprite: ReplayLoadedSprite | undefined,
  base: ReplayAnchor,
  drawX: number,
  drawY: number,
  motion: MotionState,
  isDead: boolean,
  timeMs: number,
): void => {
  const targetH = Math.round(98 * base.scale);
  const targetW = Math.round(70 * base.scale);

  if (motion.isLunging && sprite && !isDead) {
    for (const frac of [0.35, 0.68]) {
      ctx.save();
      ctx.translate(
        base.x + motion.offsetX * frac,
        base.y + motion.offsetY * frac,
      );
      ctx.globalAlpha = frac * 0.28;
      drawSpriteFrame(
        ctx,
        participant,
        sprite,
        targetW,
        targetH,
        motion.animFrame,
      );
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(drawX, drawY);

  drawUnitPedestal(
    ctx,
    participant,
    targetW,
    targetH,
    motion.isActing,
    isDead,
    timeMs,
  );

  if (isDead) {
    ctx.globalAlpha = 0.32;
    ctx.filter = "grayscale(1)";
  }

  if (sprite) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    drawSpriteFrame(
      ctx,
      participant,
      sprite,
      targetW,
      targetH,
      motion.animFrame,
    );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    const profColor =
      PROFESSION_COLORS.get(participant.prof.toLowerCase()) ?? "#eab308";

    const radius = Math.round(28 * base.scale);

    const tokenGrad = ctx.createRadialGradient(
      -radius * 0.25,
      -radius * 0.3,
      4,
      0,
      0,
      radius,
    );

    tokenGrad.addColorStop(0, "#2c3144");
    tokenGrad.addColorStop(1, "#0f121d");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = tokenGrad;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = profColor;
    ctx.stroke();

    ctx.font = `900 ${Math.round(20 * base.scale)}px Georgia, serif`;
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(participant.name.slice(0, 2).toUpperCase(), 0, 1);
  }

  if (motion.hitFlash > 0.05 && !isDead) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = motion.hitFlash * 0.9;
    const flash = ctx.createRadialGradient(0, -4, 4, 0, -4, targetW * 0.6);
    flash.addColorStop(0, "#ffffff");
    flash.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.ellipse(0, -4, targetW * 0.6, targetH * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isDead) {
    ctx.filter = "none";
    ctx.globalAlpha = 0.94;
    ctx.font = `700 ${Math.round(28 * base.scale)}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("☠", 0, 0);
  }

  ctx.restore();
};

const drawUnitHealthPlate = (
  ctx: CanvasRenderingContext2D,
  participant: ReplayParticipant,
  x: number,
  y: number,
  scale: number,
  hp: number,
  trailingHp: number,
  shield: number,
  statuses: readonly ReplayStatusTag[],
): void => {
  const barW = Math.round(130 * Math.min(1.28, scale));
  const barH = Math.round(11 * Math.min(1.25, scale));
  const topY = y + Math.round(49 * scale);
  const leftX = Math.round(x - barW / 2);

  ctx.save();

  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 10;
  traceChamferedRect(ctx, leftX - 2.5, topY - 2.5, barW + 5, barH + 5, 4);
  ctx.fillStyle = "rgba(9, 10, 18, 0.94)";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  traceChamferedRect(ctx, leftX, topY, barW, barH, 3);
  ctx.fillStyle = "rgba(26, 29, 44, 0.92)";
  ctx.fill();
  ctx.clip();

  const clampedTrailing = clamp01(trailingHp / 100);
  const clampedHp = clamp01(hp / 100);

  if (clampedTrailing > clampedHp) {
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(leftX, topY, Math.round(barW * clampedTrailing), barH);
  }

  if (clampedHp > 0) {
    const fillW = Math.round(barW * clampedHp);
    const hpGrad = ctx.createLinearGradient(leftX, topY, leftX + barW, topY);

    if (participant.side === "left") {
      if (clampedHp < 0.25) {
        hpGrad.addColorStop(0, "#d97706");
        hpGrad.addColorStop(1, "#fde047");
      } else {
        hpGrad.addColorStop(0, "#15803d");
        hpGrad.addColorStop(1, "#4ade80");
      }
    } else {
      hpGrad.addColorStop(0, "#b91c1c");
      hpGrad.addColorStop(1, "#fb7185");
    }

    ctx.fillStyle = hpGrad;
    ctx.fillRect(leftX, topY, fillW, barH);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(leftX, topY, fillW, Math.max(2, barH * 0.32));
  }

  ctx.restore();

  traceChamferedRect(ctx, leftX - 1.5, topY - 1.5, barW + 3, barH + 3, 4);
  ctx.lineWidth = shield > 0 ? 2 : 1.1;
  ctx.strokeStyle = shield > 0 ? "#38bdf8" : "rgba(226, 186, 114, 0.55)";
  ctx.stroke();

  const labelFontSize = Math.round(13 * Math.min(1.26, scale));
  ctx.font = `800 ${labelFontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const labelText = `${participant.name} [${participant.lvl}${participant.prof}]`;
  ctx.shadowColor = "rgba(0, 0, 0, 0.96)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = participant.isUser ? "#fde047" : "#f8fafc";
  ctx.fillText(labelText, x, topY + barH + 5);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (statuses.length > 0) {
    const chipR = Math.round(10 * Math.min(1.2, scale));
    const spacing = chipR * 2 + 5;
    const shown = statuses.slice(0, 4);
    const totalW = (shown.length - 1) * spacing;
    const chipY = topY - chipR - 6;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(11 * Math.min(1.2, scale))}px "Trebuchet MS", sans-serif`;

    shown.forEach((status, index) => {
      const badge = STATUS_BADGE_STYLE[status];
      const cx = x - totalW / 2 + index * spacing;
      traceRoundedRect(
        ctx,
        cx - chipR,
        chipY - chipR,
        chipR * 2,
        chipR * 2,
        chipR,
      );
      ctx.fillStyle = "rgba(10, 12, 22, 0.92)";
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = badge.color;
      ctx.stroke();
      ctx.fillStyle = badge.color;
      ctx.fillText(badge.glyph, cx, chipY + 0.5);
    });
  }

  ctx.restore();
};

const getActiveActorIds = (state: ReplayStateAtTime): ReadonlySet<string> => {
  const ids = new Set<string>();

  for (const event of state.activeEvents) {
    if (
      event.kind === "attack" ||
      event.kind === "legendary_proc" ||
      event.kind === "step" ||
      event.kind === "flee"
    ) {
      ids.add(event.actorId);
    }
  }

  return ids;
};

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  timeMs: number,
  layout: ReplayLayout,
  options: ReplayRenderOptions,
): void => {
  const { width, height } = ctx.canvas;
  const reducedMotion = options.reducedMotion ?? false;
  const state = getReplayStateAtTime(timeline, timeMs);
  const bounds = getArenaPlayfieldBounds(width, height, layout);
  const rowStepPx = bounds.height / 6;

  const anchors = computeParticipantAnchors(
    timeline.participants,
    state.rowById,
    width,
    height,
    layout,
  );

  const shake = computeScreenShake(state, reducedMotion);

  ctx.save();
  paintArenaBackground(
    ctx,
    width,
    height,
    timeline.arenaTheme,
    layout,
    timeMs,
    state.highlightIntensity,
    reducedMotion,
  );

  ctx.save();
  ctx.translate(shake.x, shake.y);

  const actingIds = getActiveActorIds(state);

  const sortedParticipants = [...timeline.participants].sort((left, right) => {
    const leftY = anchors.get(left.id)?.y ?? 0;
    const rightY = anchors.get(right.id)?.y ?? 0;

    if (leftY !== rightY) return leftY - rightY;

    return (actingIds.has(left.id) ? 1 : 0) - (actingIds.has(right.id) ? 1 : 0);
  });

  const liveAnchors = new Map<string, ReplayAnchor>();

  for (const participant of sortedParticipants) {
    const base = anchors.get(participant.id);

    if (!base) continue;

    const motion = computeParticipantMotion(
      participant,
      state,
      anchors,
      rowStepPx,
      reducedMotion,
    );

    const drawX = base.x + motion.offsetX;
    const drawY = base.y + motion.offsetY;
    liveAnchors.set(participant.id, { x: drawX, y: drawY, scale: base.scale });

    const hp = state.hpById[participant.id] ?? 100;
    const trailingHp = state.trailingHpById[participant.id] ?? hp;
    const isDead = state.deadIds.has(participant.id);
    const shield = state.shieldById[participant.id] ?? 0;
    const statuses = state.statusesById[participant.id] ?? [];

    drawParticipantSprite(
      ctx,
      participant,
      options.sprites.get(participant.icon),
      base,
      drawX,
      drawY,
      motion,
      isDead,
      timeMs,
    );

    drawUnitHealthPlate(
      ctx,
      participant,
      drawX,
      drawY,
      base.scale,
      hp,
      trailingHp,
      shield,
      statuses,
    );
  }

  paintActiveProjectilesAndParticles(ctx, state, liveAnchors, reducedMotion);
  paintFloatingCombatTextAndBanners(
    ctx,
    width,
    height,
    layout,
    state,
    liveAnchors,
    options.labels,
    reducedMotion,
  );

  ctx.restore();

  paintArenaHud(ctx, width, height, layout, timeline, state, options.labels);

  if (state.victoryEvent) {
    paintVictoryOverlay(
      ctx,
      width,
      height,
      layout,
      timeline,
      state.victoryEvent,
      state.victoryProgress,
      options.labels,
    );
  }

  ctx.restore();
};
