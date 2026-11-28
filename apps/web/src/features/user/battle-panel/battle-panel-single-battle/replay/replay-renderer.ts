import {
  getReplayStateAtTime,
  type ReplayLayout,
  type ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayRenderOptions } from "./replay-canvas-types";
import { getCameraImpact, paintCombatEffects } from "./replay-effects-painter";
import { paintFloatingText } from "./replay-floating-text-painter";
import { paintReplayHud } from "./replay-hud-painter";
import { getReplayScene, type ReplayScene } from "./replay-scene-layout";
import { paintVictoryDim, paintVictoryOverlay } from "./replay-victory-painter";
import {
  computeWarriorPoses,
  paintWarriorOverlays,
  paintWarriors,
} from "./replay-warrior-painter";

const BATTLEGROUND_ZOOM = 1.3;

const BATTLEGROUND_FOCUS_Y = 0.6;

const paintBackdrop = (
  ctx: CanvasRenderingContext2D,
  scene: ReplayScene,
  battleground: HTMLImageElement | null,
) => {
  ctx.fillStyle = "#17110c";
  ctx.fillRect(-8, -8, scene.width + 16, scene.height + 16);

  if (battleground) {
    const image = {
      width: battleground.naturalWidth,
      height: battleground.naturalHeight,
    };

    const cover = Math.max(
      scene.width / image.width,
      scene.height / image.height,
    );

    const scale = cover * BATTLEGROUND_ZOOM;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const left = (scene.width - drawWidth) / 2;

    const top = Math.min(
      0,
      Math.max(
        scene.height - drawHeight,
        scene.height / 2 - drawHeight * BATTLEGROUND_FOCUS_Y,
      ),
    );

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      battleground,
      left - 8,
      top - 8,
      drawWidth + 16,
      drawHeight + 16,
    );
  }

  ctx.fillStyle = "rgba(10, 6, 3, 0.22)";
  ctx.fillRect(-8, -8, scene.width + 16, scene.height + 16);

  const radius = Math.max(scene.width, scene.height) * 0.75;

  const vignette = ctx.createRadialGradient(
    scene.width / 2,
    scene.height * 0.55,
    radius * 0.35,
    scene.width / 2,
    scene.height * 0.55,
    radius,
  );

  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-8, -8, scene.width + 16, scene.height + 16);
};

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  timeline: ReplayTimeline,
  timeMs: number,
  layout: ReplayLayout,
  options: ReplayRenderOptions,
) => {
  const { sprites, battleground } = options.assets;
  const reducedMotion = options.reducedMotion ?? false;
  const scene = getReplayScene(timeline, layout, ctx.canvas.width, sprites);
  const state = getReplayStateAtTime(timeline, timeMs);
  const camera = getCameraImpact(state, reducedMotion);

  ctx.save();
  ctx.setTransform(scene.unit, 0, 0, scene.unit, 0, 0);
  ctx.save();
  ctx.translate(camera.x, camera.y);

  paintBackdrop(ctx, scene, battleground);

  if (state.victoryEvent) {
    paintVictoryDim(ctx, scene, state.victoryProgress);
  }

  const poses = computeWarriorPoses(
    timeline.participants,
    state,
    scene,
    reducedMotion,
  );

  paintWarriors(ctx, timeline.participants, poses, sprites, scene);
  paintCombatEffects(ctx, state, poses, scene);

  if (!state.victoryEvent) {
    paintWarriorOverlays(
      ctx,
      timeline.participants,
      poses,
      state,
      sprites,
      scene,
    );
    paintFloatingText(
      ctx,
      timeline,
      state,
      poses,
      scene,
      options.labels,
      reducedMotion,
    );
  }

  ctx.restore();

  if (camera.flash > 0) {
    ctx.fillStyle = `rgba(255, 246, 220, ${camera.flash})`;
    ctx.fillRect(0, 0, scene.width, scene.height);
  }

  if (state.victoryEvent) {
    paintVictoryOverlay(
      ctx,
      timeline,
      state.victoryEvent,
      state.victoryProgress,
      scene,
      sprites,
      options.labels,
      reducedMotion,
    );
  } else {
    paintReplayHud(ctx, timeline, state, scene, options.labels);
  }

  ctx.restore();
};
