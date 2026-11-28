import {
  REPLAY_IMPACT_FRACTION,
  type ReplayAttackEvent,
  type ReplayEvent,
  type ReplayStateAtTime,
  type ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayRenderLabels } from "./replay-canvas-types";
import { DAMAGE_KIND_COLORS } from "./replay-effects-painter";
import { clamp01, createSeededRandom, easeOutCubic } from "./replay-motion";
import { drawPixelText, formatReplayNumber } from "./replay-pixel-text";
import type { ReplayScene } from "./replay-scene-layout";
import type { WarriorPoseMap } from "./replay-warrior-painter";

type FloatingText = {
  readonly key: string;
  readonly anchorId: string;
  readonly text: string;
  readonly caption: string | null;
  readonly color: string;
  readonly size: number;
  readonly startMs: number;
  readonly lifeMs: number;
};

const TEXT_LIFE_MS = 950;

const LOOKBACK_MS = 1600;

const getImpactMs = (event: ReplayEvent) =>
  event.tStart + (event.tEnd - event.tStart) * REPLAY_IMPACT_FRACTION;

const getGuardLabel = (
  event: ReplayAttackEvent,
  labels: ReplayRenderLabels,
) => {
  if (event.isParry) return labels.parry;

  if (event.isArrowBlock) return labels.arrowBlock;

  return event.isBlock ? labels.block : null;
};

const describeAttack = (
  event: ReplayAttackEvent,
  labels: ReplayRenderLabels,
  baseSize: number,
): FloatingText | null => {
  const common = {
    key: event.id,
    anchorId: event.targetId,
    caption: null,
    size: baseSize,
    startMs: getImpactMs(event),
    lifeMs: TEXT_LIFE_MS,
  };

  if (event.isEvade) return { ...common, text: labels.evade, color: "#c9d6ea" };

  const guard = getGuardLabel(event, labels);

  if (event.damage <= 0) {
    return guard ? { ...common, text: guard, color: "#cfe3ff" } : null;
  }

  if (event.isCrit) {
    return {
      ...common,
      text: formatReplayNumber(event.damage),
      caption: labels.crit,
      color: "#ffd24a",
      size: Math.round(baseSize * 1.5),
      lifeMs: TEXT_LIFE_MS * 1.25,
    };
  }

  return {
    ...common,
    text: formatReplayNumber(event.damage),
    caption: guard ?? (event.isPierce ? labels.pierce : null),
    color: DAMAGE_KIND_COLORS[event.damageKind],
  };
};

const describeEvent = (
  event: ReplayEvent,
  labels: ReplayRenderLabels,
  baseSize: number,
): FloatingText | null => {
  if (event.kind === "attack") return describeAttack(event, labels, baseSize);

  if (event.kind === "heal" || event.kind === "shield") {
    if (event.amount <= 0) return null;

    return {
      key: event.id,
      anchorId: event.targetId,
      text: `+${formatReplayNumber(event.amount)}`,
      caption: null,
      color: event.kind === "heal" ? "#6ff07a" : "#7fd4ff",
      size: baseSize,
      startMs: event.tStart + 120,
      lifeMs: TEXT_LIFE_MS,
    };
  }

  if (event.kind === "dot") {
    if (event.damage <= 0) return null;

    return {
      key: event.id,
      anchorId: event.targetId,
      text: formatReplayNumber(event.damage),
      caption: null,
      color: DAMAGE_KIND_COLORS[event.damageKind],
      size: Math.round(baseSize * 0.85),
      startMs: event.tStart + 80,
      lifeMs: TEXT_LIFE_MS,
    };
  }

  if (event.kind === "legendary_proc") {
    return {
      key: event.id,
      anchorId: event.actorId,
      text: labels.legendary[event.legendaryKind],
      caption: null,
      color: "#ffd24a",
      size: Math.round(baseSize * 1.15),
      startMs: event.tStart,
      lifeMs: 1400,
    };
  }

  if (event.kind === "flee") {
    return {
      key: event.id,
      anchorId: event.actorId,
      text: labels.flee,
      caption: null,
      color: "#f4ead8",
      size: baseSize,
      startMs: event.tStart,
      lifeMs: TEXT_LIFE_MS,
    };
  }

  return null;
};

export const paintFloatingText = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  state: ReplayStateAtTime,
  poses: WarriorPoseMap,
  scene: ReplayScene,
  labels: ReplayRenderLabels,
  reducedMotion: boolean,
) => {
  const baseSize = scene.isVertical ? 16 : 12;
  const texts: FloatingText[] = [];

  for (const event of timeline.events) {
    if (event.tStart > state.timeMs) break;

    if (event.tEnd < state.timeMs - LOOKBACK_MS) continue;

    const text = describeEvent(event, labels, baseSize);

    if (
      text &&
      state.timeMs >= text.startMs &&
      state.timeMs <= text.startMs + text.lifeMs
    ) {
      texts.push(text);
    }
  }

  const stackIndex = new Map<string, number>();
  const spriteHeight = scene.frameHeight * scene.spriteScale;

  for (const text of [...texts].reverse()) {
    const pose = poses.get(text.anchorId);

    if (!pose) continue;

    const stack = stackIndex.get(text.anchorId) ?? 0;
    stackIndex.set(text.anchorId, stack + 1);

    const life = clamp01((state.timeMs - text.startMs) / text.lifeMs);
    const rise = reducedMotion ? 0 : easeOutCubic(Math.min(1, life * 1.6)) * 18;
    const jitter = (createSeededRandom(text.key)() - 0.5) * 16;
    const x = Math.round(pose.x + jitter);

    const y = Math.round(
      pose.feetY - spriteHeight * 0.45 - rise - stack * (text.size + 3),
    );

    ctx.save();
    ctx.globalAlpha = life < 0.65 ? 1 : 1 - (life - 0.65) / 0.35;

    drawPixelText(ctx, text.text, x, y, {
      size: text.size,
      color: text.color,
      align: "center",
      baseline: "middle",
      outlineWidth: Math.max(3, text.size / 4),
    });

    if (text.caption) {
      drawPixelText(ctx, text.caption, x, y - text.size * 0.85, {
        size: Math.round(baseSize * 0.7),
        weight: 700,
        color: "#fff4dc",
        align: "center",
        baseline: "middle",
        outlineWidth: 2.5,
      });
    }

    ctx.restore();
  }
};
