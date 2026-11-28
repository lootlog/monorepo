import type {
  ReplayOutcomeKind,
  ReplayParticipant,
  ReplayTimeline,
  ReplayVictoryEvent,
} from "@lootlog/battle-processor/replay-timeline";
import type {
  ReplayLoadedSprite,
  ReplayRenderLabels,
  ReplaySpriteMap,
} from "./replay-canvas-types";
import { SHEET_ROW } from "./replay-celebration";
import { paintPlate } from "./replay-hud-painter";
import { clamp01, createSeededRandom, easeOutCubic } from "./replay-motion";
import {
  drawPixelText,
  fitPixelText,
  formatReplayNumber,
} from "./replay-pixel-text";
import type { ReplayScene } from "./replay-scene-layout";

const OUTCOME_COLORS: Record<
  ReplayOutcomeKind,
  { fill: string; shadow: string }
> = {
  victory: { fill: "#ffd24a", shadow: "#7a4a12" },
  defeat: { fill: "#ff6b57", shadow: "#5a1410" },
  draw: { fill: "#e8e0d0", shadow: "#3d342c" },
  flee: { fill: "#e8e0d0", shadow: "#3d342c" },
  unfinished: { fill: "#e8e0d0", shadow: "#3d342c" },
};

const CONFETTI_COLORS = ["#ffd24a", "#fff4dc", "#ff6b57", "#6ff07a", "#7fd4ff"];

const CONFETTI_PIECES = 72;

const BANNER_END = 0.56;

const CARD_START = 0.5;

const TOP_SHADE_HEIGHT = 96;

export const paintVictoryDim = (
  ctx: CanvasRenderingContext2D,
  scene: ReplayScene,
  progress: number,
) => {
  ctx.fillStyle = `rgba(8, 5, 3, ${0.28 * easeOutCubic(clamp01(progress / 0.15))})`;
  ctx.fillRect(-8, -8, scene.width + 16, scene.height + 16);
};

const paintConfetti = (
  ctx: CanvasRenderingContext2D,
  scene: ReplayScene,
  elapsedMs: number,
) => {
  const random = createSeededRandom("victory-confetti");

  for (let index = 0; index < CONFETTI_PIECES; index += 1) {
    const startX = random() * scene.width;
    const delay = random() * 900;
    const speed = 0.05 + random() * 0.05;
    const sway = 6 + random() * 10;
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? "#ffd24a";
    const fall = elapsedMs - delay;

    if (fall < 0) continue;

    const y = -6 + fall * speed;

    if (y > scene.height) continue;

    const x = startX + Math.sin(fall / 260 + index) * sway;
    const flip = Math.floor(fall / 120 + index) % 2 === 0;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), flip ? 4 : 2, flip ? 2 : 4);
  }
};

const paintTopShade = (ctx: CanvasRenderingContext2D, scene: ReplayScene) => {
  const shade = ctx.createLinearGradient(0, 0, 0, TOP_SHADE_HEIGHT);
  shade.addColorStop(0, "rgba(8, 5, 3, 0.85)");
  shade.addColorStop(1, "rgba(8, 5, 3, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, scene.width, TOP_SHADE_HEIGHT);
};

const paintBanner = (
  ctx: CanvasRenderingContext2D,
  victory: ReplayVictoryEvent,
  progress: number,
  scene: ReplayScene,
  labels: ReplayRenderLabels,
) => {
  const appear = easeOutCubic(clamp01(progress / 0.14));
  const leave = clamp01((BANNER_END - progress) / 0.08);
  const opacity = Math.min(appear, leave);

  if (opacity <= 0) return;

  const colors = OUTCOME_COLORS[victory.outcome];
  const size = scene.isVertical ? 46 : 34;
  const y = (scene.isVertical ? 62 : 34) + Math.round((1 - appear) * -14);
  const text = labels.outcomes[victory.outcome];

  ctx.save();
  ctx.globalAlpha = opacity;
  drawPixelText(ctx, text, scene.width / 2 + 3, y + 4, {
    size,
    color: colors.shadow,
    align: "center",
    baseline: "middle",
    outlineWidth: 6,
  });
  drawPixelText(ctx, text, scene.width / 2, y, {
    size,
    color: colors.fill,
    align: "center",
    baseline: "middle",
    outlineWidth: 6,
  });
  ctx.restore();
};

const paintPortrait = (
  ctx: CanvasRenderingContext2D,
  sprite: ReplayLoadedSprite | undefined,
  left: number,
  top: number,
  size: number,
) => {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(left, top, size, size);

  if (!sprite) return;

  const scale = Math.max(
    1,
    Math.floor(Math.min(size / sprite.frameWidth, size / sprite.frameHeight)),
  );

  const width = sprite.frameWidth * scale;
  const height = sprite.frameHeight * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sprite.image,
    0,
    sprite.isSheet ? SHEET_ROW.south * sprite.frameHeight : 0,
    sprite.frameWidth,
    sprite.frameHeight,
    Math.round(left + (size - width) / 2),
    Math.round(top + size - height),
    width,
    height,
  );
};

const paintMvpCard = (
  ctx: CanvasRenderingContext2D,
  victory: ReplayVictoryEvent,
  mvp: ReplayParticipant,
  progress: number,
  scene: ReplayScene,
  sprites: ReplaySpriteMap,
  labels: ReplayRenderLabels,
) => {
  const appear = easeOutCubic(clamp01((progress - CARD_START) / 0.14));

  if (appear <= 0) return;

  const width = scene.isVertical ? 320 : 300;
  const height = scene.isVertical ? 78 : 62;
  const left = Math.round(scene.width / 2 - width / 2);
  const top = Math.round((scene.isVertical ? 22 : 8) + (1 - appear) * -12);
  const portraitSize = height - 12;
  const textLeft = left + portraitSize + 16;
  const textWidth = left + width - textLeft - 10;
  const size = scene.isVertical ? 13 : 11;
  const lineGap = scene.isVertical ? 20 : 16;
  const colors = OUTCOME_COLORS[victory.outcome];

  ctx.save();
  ctx.globalAlpha = appear;
  paintPlate(ctx, left, top, width, height);
  paintPortrait(ctx, sprites.get(mvp.icon), left + 7, top + 6, portraitSize);

  drawPixelText(
    ctx,
    `${labels.outcomes[victory.outcome]} · ${labels.totalTurns}: ${victory.totalTurns}`,
    textLeft,
    top + size + 6,
    { size, color: colors.fill, outline: null },
  );
  drawPixelText(
    ctx,
    fitPixelText(ctx, `${labels.mvp}: ${mvp.name}`, textWidth, size + 1),
    textLeft,
    top + size + 6 + lineGap,
    {
      size: size + 1,
      color: mvp.isUser ? "#ffd769" : "#f4ead8",
      outline: null,
    },
  );
  drawPixelText(
    ctx,
    `${labels.damageDealt}: ${formatReplayNumber(victory.mvpDamage)}`,
    textLeft,
    top + size + 6 + lineGap * 2,
    { size: size - 1, weight: 500, color: "#cdb68a", outline: null },
  );
  ctx.restore();
};

export const paintVictoryOverlay = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  victory: ReplayVictoryEvent,
  progress: number,
  scene: ReplayScene,
  sprites: ReplaySpriteMap,
  labels: ReplayRenderLabels,
) => {
  if (victory.winningTeam !== null && victory.outcome !== "draw") {
    paintConfetti(ctx, scene, progress * (victory.tEnd - victory.tStart));
  }

  paintTopShade(ctx, scene);
  paintBanner(ctx, victory, progress, scene, labels);

  const mvp = timeline.participants.find(
    (participant) => participant.id === victory.mvpId,
  );

  if (mvp) {
    paintMvpCard(ctx, victory, mvp, progress, scene, sprites, labels);
  }
};
