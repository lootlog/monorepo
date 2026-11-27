import type {
  ReplayAttackEvent,
  ReplayDamageKind,
  ReplayEvent,
  ReplayLayout,
  ReplayLegendaryProcEvent,
  ReplayStateAtTime,
} from "@lootlog/battle-processor/replay-timeline";
import { BATTLE_HEX_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { drawOrnateRpgPanel, traceChamferedRect } from "./replay-arena-painter";
import type { ReplayAnchor, ReplayRenderLabels } from "./replay-canvas-types";

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

const formatDamageNumber = (value: number): string =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ");

type FloatingTextDescriptor = {
  readonly targetId: string;
  readonly text: string;
  readonly subtext: string | null;
  readonly topColor: string;
  readonly bottomColor: string;
  readonly isCrit: boolean;
  readonly fontSize: number;
  readonly ageMs: number;
  readonly durationMs: number;
  readonly laneOffset: number;
  readonly tiltRad: number;
};

const resolveAttackAvoidBadge = (
  event: ReplayAttackEvent,
  labels: ReplayRenderLabels,
) => {
  if (event.isEvade) return { text: labels.evade, color: "#bae6fd" };

  if (event.isParry) return { text: labels.parry, color: "#c4b5fd" };

  if (event.isArrowBlock) return { text: labels.arrowBlock, color: "#86efac" };

  if (event.damage <= 0 && event.isBlock) {
    return { text: labels.block, color: "#60a5fa" };
  }

  return null;
};

const describeAttackFloatingText = (
  event: ReplayAttackEvent,
  timeMs: number,
  labels: ReplayRenderLabels,
  scale: number,
  laneOffset: number,
): FloatingTextDescriptor | null => {
  const impactTime = event.tStart + (event.tEnd - event.tStart) * 0.4;
  const ageMs = timeMs - impactTime;

  if (ageMs < 0) return null;

  const avoidBadge = resolveAttackAvoidBadge(event, labels);

  if (avoidBadge) {
    return {
      targetId: event.targetId,
      text: avoidBadge.text,
      subtext: null,
      topColor: "#ffffff",
      bottomColor: avoidBadge.color,
      isCrit: false,
      fontSize: Math.round(23 * scale),
      ageMs,
      durationMs: 780,
      laneOffset,
      tiltRad: 0,
    };
  }

  if (event.damage <= 0) return null;

  const tagParts: string[] = [];

  if (event.isBlock) tagParts.push(labels.block);

  if (event.isPierce) tagParts.push(labels.pierce);

  if (event.isCounter) tagParts.push(labels.counter);

  const fontSize = Math.round(
    (event.isVeryCrit ? 46 : event.isCrit ? 37 : 26) * scale,
  );

  const topColor = event.isVeryCrit
    ? "#fff1f2"
    : event.isCrit
      ? "#fef9c3"
      : "#ffffff";

  const bottomColor = event.isVeryCrit
    ? "#ff2d55"
    : event.isCrit
      ? "#f59e0b"
      : DAMAGE_COLORS[event.damageKind];

  const tiltRad = event.isCrit ? (event.turn % 2 === 0 ? 1 : -1) * 0.08 : 0;

  return {
    targetId: event.targetId,
    text: `-${formatDamageNumber(event.damage)}${event.isCrit ? "!" : ""}`,
    subtext: tagParts.length > 0 ? tagParts.join(" · ") : null,
    topColor,
    bottomColor,
    isCrit: event.isCrit,
    fontSize,
    ageMs,
    durationMs: event.isCrit ? 960 : 740,
    laneOffset,
    tiltRad,
  };
};

const describeFloatingText = (
  event: ReplayEvent,
  timeMs: number,
  labels: ReplayRenderLabels,
  isVertical: boolean,
  laneOffset: number,
): FloatingTextDescriptor | null => {
  const scale = isVertical ? 1.32 : 1;

  if (event.kind === "attack") {
    return describeAttackFloatingText(event, timeMs, labels, scale, laneOffset);
  }

  const ageMs = timeMs - event.tStart;

  if (ageMs < 0) return null;

  if (event.kind === "heal" && event.amount > 0) {
    return {
      targetId: event.targetId,
      text: `+${formatDamageNumber(event.amount)}`,
      subtext: event.isLastHeal ? labels.legendary.lastHeal : null,
      topColor: "#ecfdf5",
      bottomColor: event.isLastHeal ? "#fde047" : "#22c55e",
      isCrit: event.isLastHeal,
      fontSize: Math.round((event.isLastHeal ? 34 : 23) * scale),
      ageMs,
      durationMs: event.isLastHeal ? 960 : 700,
      laneOffset,
      tiltRad: 0,
    };
  }

  if (event.kind === "dot" && event.damage > 0) {
    return {
      targetId: event.targetId,
      text: `-${formatDamageNumber(event.damage)}`,
      subtext: null,
      topColor: "#fff7ed",
      bottomColor: DAMAGE_COLORS[event.damageKind],
      isCrit: false,
      fontSize: Math.round(20 * scale),
      ageMs,
      durationMs: 660,
      laneOffset,
      tiltRad: 0,
    };
  }

  if (event.kind === "flee") {
    return {
      targetId: event.actorId,
      text: labels.flee,
      subtext: null,
      topColor: "#fef9c3",
      bottomColor: "#f59e0b",
      isCrit: true,
      fontSize: Math.round(26 * scale),
      ageMs,
      durationMs: 880,
      laneOffset,
      tiltRad: 0,
    };
  }

  return null;
};

const resolveFloatingTargetKey = (event: ReplayEvent): string => {
  if (
    event.kind === "attack" ||
    event.kind === "heal" ||
    event.kind === "dot" ||
    event.kind === "shield"
  ) {
    return event.targetId;
  }

  return event.kind === "flee" ? event.actorId : "";
};

const paintFloatingTextItem = (
  ctx: CanvasRenderingContext2D,
  item: FloatingTextDescriptor,
  anchor: ReplayAnchor,
  isVertical: boolean,
): void => {
  const progress = clamp01(item.ageMs / item.durationMs);
  const rise = (isVertical ? 86 : 62) * (1 - (1 - progress) ** 2);
  const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

  const popScale =
    progress < 0.14
      ? 0.55 + (progress / 0.14) * (item.isCrit ? 0.8 : 0.6)
      : progress < 0.26
        ? 1 + (1 - (progress - 0.14) / 0.12) * (item.isCrit ? 0.35 : 0.15)
        : 1;

  const horizontalOffset =
    item.laneOffset > 0 ? ((item.laneOffset % 2) * 2 - 1) * 28 : 0;

  const x = anchor.x + horizontalOffset;
  const y = anchor.y - (isVertical ? 86 : 62) - rise - item.laneOffset * 28;

  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  ctx.translate(x, y);
  ctx.rotate(item.tiltRad);
  ctx.scale(popScale, popScale);
  ctx.font = `900 ${item.fontSize}px Impact, "Arial Black", "Trebuchet MS", sans-serif`;

  ctx.shadowColor = item.isCrit ? item.bottomColor : "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = item.isCrit ? 18 : 10;
  ctx.shadowOffsetY = 3;
  ctx.lineWidth = Math.max(4, item.fontSize * 0.16);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#06070d";
  ctx.strokeText(item.text, 0, 0);

  const textGrad = ctx.createLinearGradient(
    0,
    -item.fontSize * 0.55,
    0,
    item.fontSize * 0.45,
  );

  textGrad.addColorStop(0, item.topColor);
  textGrad.addColorStop(1, item.bottomColor);
  ctx.fillStyle = textGrad;
  ctx.fillText(item.text, 0, 0);

  if (item.subtext) {
    const subSize = Math.round(item.fontSize * 0.38);
    ctx.font = `800 ${subSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
    const subW = ctx.measureText(item.subtext).width + 18;
    const subH = subSize + 9;
    const subY = item.fontSize * 0.72;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    traceChamferedRect(ctx, -subW / 2, subY - subH / 2, subW, subH, 5);
    ctx.fillStyle = "rgba(12, 14, 24, 0.92)";
    ctx.fill();
    ctx.strokeStyle = item.bottomColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(item.subtext, 0, subY + 0.5);
  }

  ctx.restore();
};

const paintImpactSpeedLines = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: ReplayStateAtTime,
  reducedMotion: boolean,
): void => {
  if (reducedMotion || state.highlightIntensity < 0.12) return;

  const hasCritOrDeath = state.activeEvents.some(
    (ev) =>
      ev.isHighlight &&
      (ev.kind === "death" || (ev.kind === "attack" && ev.isCrit)),
  );

  if (!hasCritOrDeath) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.hypot(cx, cy);
  const intensity = state.highlightIntensity;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = intensity * 0.24;
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 2;

  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2 + state.timeMs * 0.0005;
    const innerR = maxR * (0.62 + (i % 3) * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.stroke();
  }

  ctx.restore();
};

const paintActiveLegendaryBanner = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isVertical: boolean,
  state: ReplayStateAtTime,
  labels: ReplayRenderLabels,
): void => {
  const activeLegendary = state.activeEvents.find(
    (event): event is ReplayLegendaryProcEvent =>
      event.kind === "legendary_proc" && event.isHighlight,
  );

  if (!activeLegendary) return;

  const duration = Math.max(1, activeLegendary.tEnd - activeLegendary.tStart);
  const progress = clamp01((state.timeMs - activeLegendary.tStart) / duration);

  const alpha =
    progress < 0.15
      ? progress / 0.15
      : progress > 0.8
        ? (1 - progress) / 0.2
        : 1;

  const bannerText = `✦  ${labels.legendary[activeLegendary.legendaryKind].toUpperCase()}  ✦`;
  const bannerFont = isVertical ? 28 : 19;
  const color = LEGENDARY_COLORS[activeLegendary.legendaryKind];

  ctx.font = `900 ${bannerFont}px Georgia, "Palatino Linotype", serif`;
  const textWidth = ctx.measureText(bannerText).width;
  const boxW = textWidth + (isVertical ? 76 : 62);
  const boxH = isVertical ? 58 : 44;
  const boxX = (width - boxW) / 2;
  const boxY = isVertical ? height * 0.45 : 74;

  ctx.save();
  ctx.globalAlpha = clamp01(alpha);

  const flare = ctx.createLinearGradient(
    0,
    boxY + boxH / 2,
    width,
    boxY + boxH / 2,
  );

  flare.addColorStop(0, "rgba(0, 0, 0, 0)");
  flare.addColorStop(0.5, color);
  flare.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = flare;
  ctx.fillRect(0, boxY + boxH / 2 - 2, width, 4);
  ctx.globalCompositeOperation = "source-over";

  drawOrnateRpgPanel(
    ctx,
    boxX,
    boxY,
    boxW,
    boxH,
    "#fff3c4",
    color,
    "#5c3410",
    12,
  );

  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#fff8dc";
  ctx.fillText(bannerText, width / 2, boxY + boxH / 2 + 1);
  ctx.restore();
};

export const paintFloatingCombatTextAndBanners = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ReplayLayout,
  state: ReplayStateAtTime,
  anchors: ReadonlyMap<string, ReplayAnchor>,
  labels: ReplayRenderLabels,
  reducedMotion: boolean,
): void => {
  const isVertical = layout === "9:16";
  const countByTarget = new Map<string, number>();

  paintImpactSpeedLines(ctx, width, height, state, reducedMotion);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const event of state.recentEvents) {
    const targetKey = resolveFloatingTargetKey(event);
    const lane = targetKey ? (countByTarget.get(targetKey) ?? 0) : 0;

    if (targetKey) countByTarget.set(targetKey, lane + 1);

    const item = describeFloatingText(
      event,
      state.timeMs,
      labels,
      isVertical,
      lane,
    );

    if (!item || item.ageMs > item.durationMs) continue;

    const anchor = anchors.get(item.targetId);

    if (anchor) paintFloatingTextItem(ctx, item, anchor, isVertical);
  }

  paintActiveLegendaryBanner(ctx, width, height, isVertical, state, labels);

  ctx.restore();
};
