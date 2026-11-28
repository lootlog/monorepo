import type {
  ReplayParticipant,
  ReplayStateAtTime,
  ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayRenderLabels } from "./replay-canvas-types";
import { drawPixelText, fitPixelText } from "./replay-pixel-text";
import type { ReplayScene, ReplaySide } from "./replay-scene-layout";
import { paintPixelBar } from "./replay-warrior-painter";

export const paintPlate = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
) => {
  ctx.fillStyle = "#0b0705";
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = "#c8a05a";
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = "#5a4026";
  ctx.fillRect(left + 1, top + 1, width - 2, height - 2);
  ctx.fillStyle = "rgba(24, 16, 10, 0.94)";
  ctx.fillRect(left + 2, top + 2, width - 4, height - 4);
};

type TeamSummary = {
  readonly title: string;
  readonly subtitle: string;
  readonly hp: number;
  readonly trailingHp: number;
  readonly isUser: boolean;
};

const summarizeTeam = (
  members: readonly ReplayParticipant[],
  state: ReplayStateAtTime,
  title: string,
): TeamSummary => {
  const [first] = members;

  if (members.length === 1 && first) {
    return {
      title: first.name,
      subtitle: `${first.lvl}${first.prof}`,
      hp: state.hpById[first.id] ?? 100,
      trailingHp: state.trailingHpById[first.id] ?? 100,
      isUser: first.isUser,
    };
  }

  let weight = 0;
  let hp = 0;
  let trailingHp = 0;

  for (const member of members) {
    const memberWeight = Math.max(1, member.maxHp);
    weight += memberWeight;
    hp += (state.hpById[member.id] ?? 100) * memberWeight;
    trailingHp += (state.trailingHpById[member.id] ?? 100) * memberWeight;
  }

  const alive = members.filter(
    (member) => !state.deadIds.has(member.id),
  ).length;

  return {
    title,
    subtitle: `${alive}/${members.length}`,
    hp: weight > 0 ? hp / weight : 0,
    trailingHp: weight > 0 ? trailingHp / weight : 0,
    isUser: false,
  };
};

const paintTeamPanel = (
  ctx: CanvasRenderingContext2D,
  summary: TeamSummary,
  left: number,
  top: number,
  width: number,
  align: "left" | "right",
  titleSize: number,
) => {
  const textX = align === "left" ? left : left + width;
  const subtitleSize = Math.round(titleSize * 0.8);

  drawPixelText(
    ctx,
    fitPixelText(ctx, summary.title, width - 40, titleSize),
    textX,
    top + titleSize,
    {
      size: titleSize,
      color: summary.isUser ? "#ffd769" : "#f4ead8",
      align,
      outlineWidth: 3,
    },
  );

  drawPixelText(
    ctx,
    summary.subtitle,
    align === "left" ? left + width : left,
    top + titleSize,
    {
      size: subtitleSize,
      weight: 500,
      color: "#cdb68a",
      align: align === "left" ? "right" : "left",
      outlineWidth: 3,
    },
  );

  const barTop = top + titleSize + 5;
  const barHeight = Math.round(titleSize * 0.6);

  paintPixelBar(
    ctx,
    left,
    barTop,
    width,
    barHeight,
    summary.hp,
    summary.trailingHp,
  );
};

const getTeam = (timeline: ReplayTimeline, side: ReplaySide) =>
  timeline.participants
    .filter((participant) => participant.side === side)
    .sort((a, b) => a.slotIndex - b.slotIndex);

export const paintReplayHud = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  state: ReplayStateAtTime,
  scene: ReplayScene,
  labels: ReplayRenderLabels,
) => {
  const ally = summarizeTeam(getTeam(timeline, "left"), state, labels.yourTeam);

  const enemy = summarizeTeam(
    getTeam(timeline, "right"),
    state,
    labels.enemyTeam,
  );

  const turnText = labels.turn
    .replace("{{current}}", String(Math.max(1, state.currentTurn)))
    .replace("{{total}}", String(timeline.totalTurns));

  if (!scene.isVertical) {
    const shade = ctx.createLinearGradient(0, 0, 0, 52);
    shade.addColorStop(0, "rgba(8, 5, 3, 0.86)");
    shade.addColorStop(1, "rgba(8, 5, 3, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, scene.width, 52);

    paintTeamPanel(ctx, ally, 12, 6, 220, "left", 12);
    paintTeamPanel(ctx, enemy, scene.width - 232, 6, 220, "right", 12);

    paintPlate(ctx, scene.width / 2 - 42, 7, 84, 22);
    drawPixelText(ctx, turnText, scene.width / 2, 22, {
      size: 11,
      color: "#ffe6a8",
      align: "center",
      outline: null,
    });

    drawPixelText(ctx, labels.watermark, scene.width - 10, scene.height - 9, {
      size: 10,
      color: "rgba(255, 244, 220, 0.85)",
      align: "right",
      outlineWidth: 3,
    });

    return;
  }

  const topShade = ctx.createLinearGradient(0, 0, 0, 120);
  topShade.addColorStop(0, "rgba(8, 5, 3, 0.9)");
  topShade.addColorStop(1, "rgba(8, 5, 3, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, scene.width, 120);

  const bottomShade = ctx.createLinearGradient(
    0,
    scene.height - 130,
    0,
    scene.height,
  );

  bottomShade.addColorStop(0, "rgba(8, 5, 3, 0)");
  bottomShade.addColorStop(1, "rgba(8, 5, 3, 0.92)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, scene.height - 130, scene.width, 130);

  paintPlate(ctx, scene.width / 2 - 50, 14, 100, 26);
  drawPixelText(ctx, turnText, scene.width / 2, 32, {
    size: 13,
    color: "#ffe6a8",
    align: "center",
    outline: null,
  });

  paintTeamPanel(ctx, enemy, 24, 52, scene.width - 48, "left", 15);
  paintTeamPanel(
    ctx,
    ally,
    24,
    scene.height - 96,
    scene.width - 48,
    "left",
    15,
  );

  drawPixelText(ctx, labels.watermark, scene.width / 2, scene.height - 22, {
    size: 13,
    color: "rgba(255, 244, 220, 0.85)",
    align: "center",
    outlineWidth: 3,
  });
};
