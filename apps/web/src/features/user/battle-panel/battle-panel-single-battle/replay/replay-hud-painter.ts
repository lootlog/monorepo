import type {
  ReplayEvent,
  ReplayLayout,
  ReplayParticipant,
  ReplayStateAtTime,
  ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import {
  ARENA_PALETTES,
  drawOrnateRpgPanel,
  traceChamferedRect,
  type ArenaAtmospherePalette,
} from "./replay-arena-painter";
import type { ReplayRenderLabels } from "./replay-canvas-types";

const averageTeamHp = (
  timeline: ReplayTimeline,
  state: ReplayStateAtTime,
  side: "left" | "right",
): number => {
  let sum = 0;
  let count = 0;

  for (const participant of timeline.participants) {
    if (participant.side !== side) continue;
    sum += state.hpById[participant.id] ?? 100;
    count += 1;
  }

  return count > 0 ? sum / count : 0;
};

type LogSegment = {
  readonly text: string;
  readonly color: string;
  readonly bold?: boolean;
};

type FormattedLogLine = {
  readonly turn: number;
  readonly segments: readonly LogSegment[];
};

const formatNum = (value: number): string =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ");

const warriorSegment = (
  id: string | null,
  byId: ReadonlyMap<string, ReplayParticipant>,
): LogSegment => {
  const participant = id ? byId.get(id) : undefined;

  if (!participant) return { text: "?", color: "#f8fafc", bold: true };

  return {
    text: participant.name,
    color: participant.side === "left" ? "#4ade80" : "#fb7185",
    bold: true,
  };
};

const formatAttackLogLine = (
  event: Extract<ReplayEvent, { readonly kind: "attack" }>,
  byId: ReadonlyMap<string, ReplayParticipant>,
  labels: ReplayRenderLabels,
): FormattedLogLine => {
  const actor = warriorSegment(event.actorId, byId);
  const target = warriorSegment(event.targetId, byId);

  if (event.isEvade || event.isParry || event.isArrowBlock) {
    const tag = event.isEvade
      ? labels.evade
      : event.isParry
        ? labels.parry
        : labels.arrowBlock;

    return {
      turn: event.turn,
      segments: [
        target,
        { text: ` — ${tag} `, color: "#93c5fd", bold: true },
        { text: "(", color: "#94a3b8" },
        actor,
        { text: ")", color: "#94a3b8" },
      ],
    };
  }

  const segments: LogSegment[] = [actor];

  if (event.spellName) {
    segments.push({ text: ` [${event.spellName}]`, color: "#e9d5ff" });
  }

  segments.push({ text: " → ", color: "#94a3b8" }, target);

  if (event.damage > 0) {
    const critColor = event.isVeryCrit
      ? "#ff5c7a"
      : event.isCrit
        ? "#fde047"
        : "#f8fafc";

    segments.push({
      text: `: -${formatNum(event.damage)}${event.isCrit ? "!" : ""}`,
      color: critColor,
      bold: true,
    });
  }

  const flags: string[] = [];

  if (event.isBlock) flags.push(labels.block);

  if (event.isPierce) flags.push(labels.pierce);

  if (event.isCounter) flags.push(labels.counter);

  if (flags.length > 0) {
    segments.push({ text: ` (${flags.join(", ")})`, color: "#93c5fd" });
  }

  return { turn: event.turn, segments };
};

const formatLogEventLine = (
  event: ReplayEvent,
  byId: ReadonlyMap<string, ReplayParticipant>,
  labels: ReplayRenderLabels,
): FormattedLogLine | null => {
  if (event.kind === "attack") {
    return formatAttackLogLine(event, byId, labels);
  }

  if (event.kind === "legendary_proc") {
    return {
      turn: event.turn,
      segments: [
        { text: "★ ", color: "#fbbf24", bold: true },
        warriorSegment(event.actorId, byId),
        {
          text: `: ${labels.legendary[event.legendaryKind]}`,
          color: "#fde68a",
          bold: true,
        },
      ],
    };
  }

  if (event.kind === "heal" && event.amount > 0) {
    return {
      turn: event.turn,
      segments: [
        warriorSegment(event.targetId, byId),
        {
          text: ` +${formatNum(event.amount)} HP`,
          color: "#4ade80",
          bold: true,
        },
      ],
    };
  }

  if (event.kind === "dot" && event.damage > 0) {
    return {
      turn: event.turn,
      segments: [
        warriorSegment(event.targetId, byId),
        {
          text: ` -${formatNum(event.damage)} (${labels.effectLog})`,
          color: "#fb923c",
        },
      ],
    };
  }

  if (event.kind === "shield" && event.amount > 0) {
    return {
      turn: event.turn,
      segments: [
        warriorSegment(event.targetId, byId),
        {
          text: ` +${formatNum(event.amount)} ${labels.shieldLog}`,
          color: "#38bdf8",
        },
      ],
    };
  }

  if (event.kind === "step") {
    return {
      turn: event.turn,
      segments: [
        warriorSegment(event.actorId, byId),
        { text: ` ${labels.stepLog}`, color: "#94a3b8" },
      ],
    };
  }

  if (event.kind === "death") {
    return {
      turn: event.turn,
      segments: [
        { text: "☠ ", color: "#fb7185", bold: true },
        warriorSegment(event.victimId, byId),
        { text: ` ${labels.diedLog}`, color: "#fb7185", bold: true },
      ],
    };
  }

  if (event.kind === "flee") {
    return {
      turn: event.turn,
      segments: [
        warriorSegment(event.actorId, byId),
        { text: ` — ${labels.flee}`, color: "#fbbf24", bold: true },
      ],
    };
  }

  return null;
};

const collectRollingLogLines = (
  timeline: ReplayTimeline,
  timeMs: number,
  maxLines: number,
  byId: ReadonlyMap<string, ReplayParticipant>,
  labels: ReplayRenderLabels,
): FormattedLogLine[] => {
  const lines: FormattedLogLine[] = [];

  for (
    let i = timeline.events.length - 1;
    i >= 0 && lines.length < maxLines;
    i -= 1
  ) {
    const ev = timeline.events[i];

    if (!ev || ev.kind === "victory" || ev.tStart > timeMs) continue;

    const formatted = formatLogEventLine(ev, byId, labels);

    if (formatted) lines.unshift(formatted);
  }

  return lines;
};

const measureLogLineWidth = (
  ctx: CanvasRenderingContext2D,
  line: FormattedLogLine,
  fontSize: number,
): number => {
  let total = 0;

  if (line.turn > 0) {
    ctx.font = `700 ${Math.round(fontSize * 0.78)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    total += ctx.measureText(`#${line.turn}`).width + 26;
  }

  for (const seg of line.segments) {
    ctx.font = `${seg.bold ? 800 : 600} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
    total += ctx.measureText(seg.text).width;
  }

  return total;
};

const paintCombatLogLine = (
  ctx: CanvasRenderingContext2D,
  line: FormattedLogLine,
  startX: number,
  rowY: number,
  maxWidth: number,
  baseFontSize: number,
): void => {
  const rawWidth = measureLogLineWidth(ctx, line, baseFontSize);

  const fontSize =
    rawWidth > maxWidth
      ? Math.max(14, Math.floor(baseFontSize * (maxWidth / rawWidth)))
      : baseFontSize;

  let cursorX = startX;

  if (line.turn > 0) {
    const turnTag = `#${line.turn}`;
    const tagFont = Math.round(fontSize * 0.76);
    ctx.font = `700 ${tagFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
    const tagW = Math.max(tagFont * 2.1, ctx.measureText(turnTag).width + 14);
    const tagH = Math.round(fontSize * 1.18);

    traceChamferedRect(ctx, cursorX, rowY - tagH / 2, tagW, tagH, 4);
    ctx.fillStyle = "rgba(245, 196, 108, 0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 196, 108, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.textAlign = "center";
    ctx.fillText(turnTag, cursorX + tagW / 2, rowY + 0.5);
    ctx.textAlign = "left";
    cursorX += tagW + 10;
  }

  for (const seg of line.segments) {
    ctx.font = `${seg.bold ? 800 : 600} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.text, cursorX, rowY);
    cursorX += ctx.measureText(seg.text).width;
  }
};

const paintCombatLogStrip = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isVertical: boolean,
  timeline: ReplayTimeline,
  state: ReplayStateAtTime,
  labels: ReplayRenderLabels,
  palette: ArenaAtmospherePalette,
): void => {
  const padX = 24;
  const maxLines = isVertical ? 4 : 3;
  const barH = isVertical ? 264 : 138;
  const barY = height - barH - (isVertical ? 24 : 14);
  const watermarkW = isVertical ? 204 : 160;
  const logW = width - padX * 2 - watermarkW - 14;

  drawOrnateRpgPanel(
    ctx,
    padX,
    barY,
    logW,
    barH,
    palette.borderLight,
    palette.borderMid,
    palette.borderDark,
    14,
  );

  const byId = new Map(timeline.participants.map((p) => [p.id, p]));

  const rollingLines = collectRollingLogLines(
    timeline,
    state.timeMs,
    maxLines,
    byId,
    labels,
  );

  const lines: FormattedLogLine[] =
    rollingLines.length > 0
      ? rollingLines
      : [
          {
            turn: 0,
            segments: [{ text: labels.logStart, color: "#cbd5e1" }],
          },
        ];

  const fontSize = isVertical ? 33 : 22;
  const lineGap = isVertical ? 58 : 40;
  const padTop = isVertical ? 45 : 30;
  const textMaxW = logW - 44;

  ctx.save();
  ctx.beginPath();
  ctx.rect(padX + 10, barY + 6, logW - 20, barH - 12);
  ctx.clip();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  lines.forEach((line, index) => {
    const isLatest = index === lines.length - 1;
    const rowY = barY + padTop + index * lineGap;

    if (isLatest && rollingLines.length > 0) {
      const rowGrad = ctx.createLinearGradient(
        padX + 12,
        rowY,
        padX + logW - 12,
        rowY,
      );

      rowGrad.addColorStop(0, "rgba(250, 204, 108, 0.16)");
      rowGrad.addColorStop(0.65, "rgba(250, 204, 108, 0.06)");
      rowGrad.addColorStop(1, "rgba(250, 204, 108, 0)");
      traceChamferedRect(
        ctx,
        padX + 12,
        rowY - lineGap / 2 + 2,
        logW - 24,
        lineGap - 4,
        6,
      );
      ctx.fillStyle = rowGrad;
      ctx.fill();
    }

    ctx.globalAlpha = isLatest ? 1 : index === lines.length - 2 ? 0.72 : 0.46;
    paintCombatLogLine(ctx, line, padX + 22, rowY, textMaxW, fontSize);
  });

  ctx.restore();

  const wmX = padX + logW + 14;
  drawOrnateRpgPanel(
    ctx,
    wmX,
    barY,
    watermarkW,
    barH,
    palette.borderLight,
    palette.borderMid,
    palette.borderDark,
    14,
  );

  const cx = wmX + watermarkW / 2;
  const crestY = barY + barH / 2 - (isVertical ? 22 : 16);
  const cr = isVertical ? 15 : 10;

  const gemGrad = ctx.createRadialGradient(cx, crestY, 1, cx, crestY, cr * 1.9);
  gemGrad.addColorStop(0, "#ffffff");
  gemGrad.addColorStop(0.35, "#fde047");
  gemGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  ctx.arc(cx, crestY, cr * 1.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.moveTo(cx, crestY - cr);
  ctx.lineTo(cx + cr * 0.72, crestY);
  ctx.lineTo(cx, crestY + cr);
  ctx.lineTo(cx - cr * 0.72, crestY);
  ctx.closePath();
  ctx.fill();

  const wmGrad = ctx.createLinearGradient(
    0,
    barY + barH * 0.45,
    0,
    barY + barH * 0.85,
  );

  wmGrad.addColorStop(0, "#fff7d6");
  wmGrad.addColorStop(0.55, "#f5c556");
  wmGrad.addColorStop(1, "#b47824");
  ctx.font = `900 ${isVertical ? 26 : 18}px Georgia, "Palatino Linotype", serif`;
  ctx.fillStyle = wmGrad;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels.watermark, cx, barY + barH / 2 + (isVertical ? 16 : 12));
};

export const paintArenaHud = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ReplayLayout,
  timeline: ReplayTimeline,
  state: ReplayStateAtTime,
  labels: ReplayRenderLabels,
): void => {
  const isVertical = layout === "9:16";
  const palette = ARENA_PALETTES[timeline.arenaTheme];
  const padX = 24;
  const topY = isVertical ? 22 : 12;
  const barH = isVertical ? 70 : 48;

  ctx.save();

  drawOrnateRpgPanel(
    ctx,
    padX,
    topY,
    width - padX * 2,
    barH,
    palette.borderLight,
    palette.borderMid,
    palette.borderDark,
    12,
  );

  const midY = topY + barH / 2;
  const metaFont = isVertical ? 23 : 15;
  ctx.font = `700 ${metaFont}px Georgia, "Palatino Linotype", serif`;
  ctx.textBaseline = "middle";

  const meta = [timeline.battleType, timeline.world]
    .filter(Boolean)
    .join("  ✦  ");

  ctx.fillStyle = palette.borderLight;
  ctx.textAlign = "left";
  ctx.fillText(meta, padX + 24, midY);

  const turnText = labels.turnCounter
    .replace("{{current}}", String(state.currentTurn))
    .replace("{{total}}", String(timeline.totalTurns));

  const titleGrad = ctx.createLinearGradient(0, topY + 8, 0, topY + barH - 8);
  titleGrad.addColorStop(0, "#ffffff");
  titleGrad.addColorStop(0.55, "#fde68a");
  titleGrad.addColorStop(1, "#d49b38");
  ctx.font = `900 ${isVertical ? 26 : 17}px Georgia, "Palatino Linotype", serif`;
  ctx.fillStyle = titleGrad;
  ctx.textAlign = "center";
  ctx.fillText(turnText, width / 2, midY + 0.5);

  const leftHp = averageTeamHp(timeline, state, "left");
  const rightHp = averageTeamHp(timeline, state, "right");
  const gaugeW = isVertical ? 232 : 204;
  const gaugeH = isVertical ? 14 : 11;
  const gaugeX = width - padX - gaugeW - 22;
  const gaugeY = midY - gaugeH / 2;

  ctx.save();
  traceChamferedRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fill();
  ctx.clip();

  const totalHp = Math.max(1, leftHp + rightHp);
  const leftW = Math.max(0, Math.round(gaugeW * (leftHp / totalHp)));

  if (leftW > 0) {
    const leftGrad = ctx.createLinearGradient(gaugeX, 0, gaugeX + leftW, 0);
    leftGrad.addColorStop(0, "#15803d");
    leftGrad.addColorStop(1, "#4ade80");
    ctx.fillStyle = leftGrad;
    ctx.fillRect(gaugeX, gaugeY, leftW, gaugeH);
  }

  if (gaugeW - leftW > 0) {
    const rightGrad = ctx.createLinearGradient(
      gaugeX + leftW,
      0,
      gaugeX + gaugeW,
      0,
    );

    rightGrad.addColorStop(0, "#fb7185");
    rightGrad.addColorStop(1, "#b91c1c");
    ctx.fillStyle = rightGrad;
    ctx.fillRect(gaugeX + leftW, gaugeY, gaugeW - leftW, gaugeH);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(gaugeX, gaugeY, gaugeW, Math.max(2, gaugeH * 0.3));

  if (leftW > 2 && leftW < gaugeW - 2) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(gaugeX + leftW - 1.5, gaugeY, 3, gaugeH);
  }

  ctx.restore();

  traceChamferedRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 4);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = palette.borderMid;
  ctx.stroke();

  paintCombatLogStrip(
    ctx,
    width,
    height,
    isVertical,
    timeline,
    state,
    labels,
    palette,
  );

  ctx.restore();
};
