import type {
  ReplayOutcomeKind,
  ReplayTimeline,
  ReplayVictoryEvent,
} from "@lootlog/battle-processor/replay-timeline";
import type {
  ReplayRenderLabels,
  ReplaySpriteMap,
} from "./replay-canvas-types";
import { paintPlate } from "./replay-hud-painter";
import { clamp01, easeOutCubic } from "./replay-motion";
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

export const paintVictoryOverlay = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  victory: ReplayVictoryEvent,
  progress: number,
  scene: ReplayScene,
  sprites: ReplaySpriteMap,
  labels: ReplayRenderLabels,
) => {
  const fadeIn = easeOutCubic(clamp01(progress / 0.22));
  const centerX = scene.width / 2;
  const bannerY = scene.isVertical ? 250 : 120;
  const bannerSize = scene.isVertical ? 46 : 40;
  const colors = OUTCOME_COLORS[victory.outcome];

  ctx.fillStyle = `rgba(8, 5, 3, ${0.62 * fadeIn})`;
  ctx.fillRect(0, 0, scene.width, scene.height);

  const drop = Math.round((1 - fadeIn) * -16);

  ctx.save();
  ctx.globalAlpha = fadeIn;
  drawPixelText(
    ctx,
    labels.outcomes[victory.outcome],
    centerX + 3,
    bannerY + drop + 4,
    {
      size: bannerSize,
      color: colors.shadow,
      align: "center",
      baseline: "middle",
      outlineWidth: 6,
    },
  );
  drawPixelText(
    ctx,
    labels.outcomes[victory.outcome],
    centerX,
    bannerY + drop,
    {
      size: bannerSize,
      color: colors.fill,
      align: "center",
      baseline: "middle",
      outlineWidth: 6,
    },
  );
  drawPixelText(
    ctx,
    `${labels.totalTurns}: ${victory.totalTurns}`,
    centerX,
    bannerY + bannerSize * 0.85,
    {
      size: scene.isVertical ? 15 : 12,
      weight: 500,
      color: "#e8dcc4",
      align: "center",
      baseline: "middle",
      outlineWidth: 3,
    },
  );
  ctx.restore();

  const mvp = timeline.participants.find(
    (participant) => participant.id === victory.mvpId,
  );

  if (!mvp) return;

  const cardIn = easeOutCubic(clamp01((progress - 0.18) / 0.25));

  if (cardIn <= 0) return;

  const cardWidth = scene.isVertical ? 280 : 250;
  const cardHeight = scene.isVertical ? 96 : 80;
  const cardLeft = Math.round(centerX - cardWidth / 2);
  const cardTop = Math.round(bannerY + bannerSize * 1.5 + (1 - cardIn) * 14);

  ctx.save();
  ctx.globalAlpha = cardIn;
  paintPlate(ctx, cardLeft, cardTop, cardWidth, cardHeight);

  const sprite = sprites.get(mvp.icon);
  const portraitSize = cardHeight - 14;
  const portraitLeft = cardLeft + 10;
  const portraitTop = cardTop + 7;

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(portraitLeft, portraitTop, portraitSize, portraitSize);

  if (sprite) {
    const scale = Math.max(
      1,
      Math.floor(
        Math.min(
          portraitSize / sprite.frameWidth,
          portraitSize / sprite.frameHeight,
        ),
      ),
    );

    const width = sprite.frameWidth * scale;
    const height = sprite.frameHeight * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite.image,
      0,
      0,
      sprite.frameWidth,
      sprite.frameHeight,
      Math.round(portraitLeft + (portraitSize - width) / 2),
      Math.round(portraitTop + portraitSize - height),
      width,
      height,
    );
  }

  const textLeft = portraitLeft + portraitSize + 10;
  const textWidth = cardLeft + cardWidth - textLeft - 10;
  const titleSize = scene.isVertical ? 14 : 12;

  drawPixelText(ctx, labels.mvp, textLeft, cardTop + titleSize + 8, {
    size: titleSize,
    color: "#ffd24a",
    outline: null,
  });
  drawPixelText(
    ctx,
    fitPixelText(ctx, mvp.name, textWidth, titleSize + 2),
    textLeft,
    cardTop + titleSize * 2 + 14,
    {
      size: titleSize + 2,
      color: mvp.isUser ? "#ffd769" : "#f4ead8",
      outline: null,
    },
  );
  drawPixelText(
    ctx,
    `${labels.damageDealt}: ${formatReplayNumber(victory.mvpDamage)}`,
    textLeft,
    cardTop + titleSize * 3 + 20,
    { size: titleSize - 1, weight: 500, color: "#cdb68a", outline: null },
  );
  ctx.restore();
};
