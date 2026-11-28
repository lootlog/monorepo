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

const GIF_PALETTE_COLORS = 255;

const GIF_TRANSPARENT_INDEX = 255;

const GIF_PALETTE_SAMPLES = 8;

const GIF_KEEP_PREVIOUS_FRAME = 1;

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

  const toCentiseconds = (frame: number) =>
    Math.round((frame * frameStepMs) / 10);

  const totalFrames = Math.max(
    1,
    Math.ceil(params.timeline.totalDurationMs / frameStepMs),
  );

  const renderRgba = (frame: number) => {
    renderFrame(ctx, params.timeline, frame * frameStepMs, params.layout, {
      ...params.renderOptions,
      reducedMotion: false,
    });

    return ctx.getImageData(0, 0, width, height).data;
  };

  const frameBytes = width * height * 4;
  const samples = new Uint8ClampedArray(frameBytes * GIF_PALETTE_SAMPLES);

  for (let sample = 0; sample < GIF_PALETTE_SAMPLES; sample += 1) {
    const frame = Math.floor((sample / GIF_PALETTE_SAMPLES) * totalFrames);
    samples.set(renderRgba(frame), sample * frameBytes);
  }

  const quantized = quantize(samples, GIF_PALETTE_COLORS);

  const palette = [
    ...quantized,
    ...Array.from(
      { length: GIF_TRANSPARENT_INDEX + 1 - quantized.length },
      () => [0, 0, 0],
    ),
  ];

  let previous: Uint8Array | null = null;

  for (let frame = 0; frame < totalFrames; frame += 1) {
    throwIfAborted(params.signal);

    const indexed = applyPalette(renderRgba(frame), palette);
    const changed = previous ? new Uint8Array(indexed.length) : indexed;

    if (previous) {
      for (let pixel = 0; pixel < indexed.length; pixel += 1) {
        changed[pixel] =
          indexed[pixel] === previous[pixel]
            ? GIF_TRANSPARENT_INDEX
            : (indexed[pixel] ?? 0);
      }
    }

    encoder.writeFrame(changed, width, height, {
      palette: previous ? null : palette,
      delay: (toCentiseconds(frame + 1) - toCentiseconds(frame)) * 10,
      repeat: 0,
      transparent: previous !== null,
      transparentIndex: GIF_TRANSPARENT_INDEX,
      dispose: GIF_KEEP_PREVIOUS_FRAME,
    });

    previous = indexed;

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
