import { REPLAY_GIF_DIMENSIONS } from "./replay-canvas-types";
import {
  buildExportFilename,
  throwIfAborted,
  yieldToMainThread,
  type ReplayExportParams,
  type ReplayExportResult,
} from "./replay-export-types";
import { renderFrame } from "./replay-renderer";

const GIF_FPS = 15;

const GIF_MAX_COLORS = 128;

export const exportReplayToGif = async (
  params: ReplayExportParams,
): Promise<ReplayExportResult> => {
  const { width, height } = REPLAY_GIF_DIMENSIONS[params.layout];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) throw new Error("Could not initialize 2D canvas context");

  params.onProgress?.({
    phase: "preparing",
    completedFrames: 0,
    totalFrames: 1,
    progress: 0,
  });

  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  throwIfAborted(params.signal);

  const encoder = GIFEncoder();
  const frameStepMs = 1000 / GIF_FPS;
  const frameDelayMs = Math.round(frameStepMs);

  const totalFrames = Math.max(
    1,
    Math.ceil(params.timeline.totalDurationMs / frameStepMs),
  );

  for (let frame = 0; frame < totalFrames; frame += 1) {
    throwIfAborted(params.signal);

    renderFrame(ctx, params.timeline, frame * frameStepMs, params.layout, {
      ...params.renderOptions,
      reducedMotion: false,
    });

    const rgba = ctx.getImageData(0, 0, width, height).data;
    const palette = quantize(rgba, GIF_MAX_COLORS);
    const indexed = applyPalette(rgba, palette);

    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: frameDelayMs,
      repeat: 0,
    });

    if (frame % 3 === 0 || frame === totalFrames - 1) {
      params.onProgress?.({
        phase: "encoding",
        completedFrames: frame + 1,
        totalFrames,
        progress: (frame + 1) / totalFrames,
      });
      await yieldToMainThread();
    }
  }

  throwIfAborted(params.signal);
  encoder.finish();

  const bytes = encoder.bytes();
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);

  return {
    blob: new Blob([copy], { type: "image/gif" }),
    filename: buildExportFilename(params.battleId, params.layout, "gif"),
    mimeType: "image/gif",
    extension: "gif",
  };
};
