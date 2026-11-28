import {
  REPLAY_IMPACT_FRACTION,
  type ReplayAttackEvent,
  type ReplayEvent,
  type ReplayStateAtTime,
  type ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayRenderLabels } from "./replay-canvas-types";
import { DAMAGE_KIND_COLORS } from "./replay-effects-painter";
import { getLegendaryColor } from "./replay-legendary-painter";
import { clamp01, createSeededRandom, easeOutCubic } from "./replay-motion";
import {
  drawPixelText,
  formatReplayNumber,
  measurePixelText,
} from "./replay-pixel-text";
import type { ReplayScene } from "./replay-scene-layout";
import type { WarriorPoseMap } from "./replay-warrior-painter";

type TextSegment = { readonly text: string; readonly color: string };

type FloatingText = {
  readonly key: string;
  readonly anchorId: string;
  readonly segments: readonly TextSegment[];
  readonly caption: string | null;
  readonly captionColor: string;
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

const CAPTION_COLOR = "#fff4dc";

const CRIT_CAPTION_COLOR = "#ffd24a";

const VERY_CRIT_CAPTION_COLOR = "#ff4e91";

const getCritCaptionColor = (event: ReplayAttackEvent) =>
  event.isVeryCrit ? VERY_CRIT_CAPTION_COLOR : CRIT_CAPTION_COLOR;

const getDamageSegments = (event: ReplayAttackEvent): TextSegment[] => {
  if (event.damageParts.length === 0) {
    return [
      {
        text: formatReplayNumber(event.damage),
        color: DAMAGE_KIND_COLORS[event.damageKind],
      },
    ];
  }

  return event.damageParts.map((part, index) => ({
    text: `${index === 0 ? "" : "+"}${formatReplayNumber(part.amount)}`,
    color: DAMAGE_KIND_COLORS[part.kind],
  }));
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
    captionColor: CAPTION_COLOR,
    size: baseSize,
    startMs: getImpactMs(event),
    lifeMs: TEXT_LIFE_MS,
  };

  if (event.isEvade) {
    return { ...common, segments: [{ text: labels.evade, color: "#c9d6ea" }] };
  }

  const guard = getGuardLabel(event, labels);

  if (event.damage <= 0) {
    return guard
      ? { ...common, segments: [{ text: guard, color: "#cfe3ff" }] }
      : null;
  }

  if (event.isCrit) {
    return {
      ...common,
      segments: getDamageSegments(event),
      caption: labels.crit,
      captionColor: getCritCaptionColor(event),
      size: Math.round(baseSize * (event.isVeryCrit ? 1.8 : 1.5)),
      lifeMs: TEXT_LIFE_MS * 1.25,
    };
  }

  return {
    ...common,
    segments: getDamageSegments(event),
    caption: guard ?? (event.isPierce ? labels.pierce : null),
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
      segments: [
        {
          text: `+${formatReplayNumber(event.amount)}`,
          color: event.kind === "heal" ? "#6ff07a" : "#7fd4ff",
        },
      ],
      caption: null,
      captionColor: CAPTION_COLOR,
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
      segments: [
        {
          text: formatReplayNumber(event.damage),
          color: DAMAGE_KIND_COLORS[event.damageKind],
        },
      ],
      caption: null,
      captionColor: CAPTION_COLOR,
      size: Math.round(baseSize * 0.85),
      startMs: event.tStart + 80,
      lifeMs: TEXT_LIFE_MS,
    };
  }

  if (event.kind === "legendary_proc") {
    return {
      key: event.id,
      anchorId: event.actorId,
      segments: [
        {
          text: labels.legendary[event.legendaryKind],
          color: getLegendaryColor(event.legendaryKind),
        },
      ],
      caption: null,
      captionColor: CAPTION_COLOR,
      size: Math.round(baseSize * 1.15),
      startMs: event.tStart,
      lifeMs: 1400,
    };
  }

  if (event.kind === "flee") {
    return {
      key: event.id,
      anchorId: event.actorId,
      segments: [{ text: labels.flee, color: "#f4ead8" }],
      caption: null,
      captionColor: CAPTION_COLOR,
      size: baseSize,
      startMs: event.tStart,
      lifeMs: TEXT_LIFE_MS,
    };
  }

  return null;
};

const paintSegments = (
  ctx: CanvasRenderingContext2D,
  text: FloatingText,
  centerX: number,
  y: number,
) => {
  const gap = Math.round(text.size * 0.3);

  const widths = text.segments.map((segment) =>
    measurePixelText(ctx, segment.text, text.size),
  );

  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    gap * (text.segments.length - 1);

  let left = centerX - totalWidth / 2;

  for (const [index, segment] of text.segments.entries()) {
    drawPixelText(ctx, segment.text, Math.round(left), y, {
      size: text.size,
      color: segment.color,
      align: "left",
      baseline: "middle",
      outlineWidth: Math.max(3, text.size / 4),
    });
    left += (widths[index] ?? 0) + gap;
  }
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

    paintSegments(ctx, text, x, y);

    if (text.caption) {
      drawPixelText(ctx, text.caption, x, y - text.size * 0.85, {
        size: Math.round(baseSize * 0.7),
        weight: 700,
        color: text.captionColor,
        align: "center",
        baseline: "middle",
        outlineWidth: 2.5,
      });
    }

    ctx.restore();
  }
};
