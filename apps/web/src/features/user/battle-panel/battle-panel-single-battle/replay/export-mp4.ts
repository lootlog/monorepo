import { REPLAY_VIDEO_DIMENSIONS } from "./replay-canvas-types";
import {
  buildExportFilename,
  throwIfAborted,
  yieldToMainThread,
  type ReplayExportParams,
  type ReplayExportResult,
} from "./replay-export-types";
import { renderFrame } from "./replay-renderer";

const VIDEO_FPS = 30;

const KEYFRAME_INTERVAL = 60;

const H264_CODEC_CANDIDATES = [
  "avc1.640028",
  "avc1.420028",
  "avc1.42001f",
] as const;

const pickSupportedVideoConfig = async (
  width: number,
  height: number,
): Promise<VideoEncoderConfig | null> => {
  const EncoderCtor = globalThis.VideoEncoder;

  if (!EncoderCtor || !globalThis.VideoFrame) return null;

  for (const codec of H264_CODEC_CANDIDATES) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: width >= 1080 ? 5_500_000 : 3_500_000,
      framerate: VIDEO_FPS,
    };

    try {
      const support = await EncoderCtor.isConfigSupported(config);

      if (support.supported) return config;
    } catch {}
  }

  return null;
};

const exportWithMediaRecorder = async (
  params: ReplayExportParams,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<ReplayExportResult> => {
  const MediaRecorderCtor = globalThis.MediaRecorder;

  if (!MediaRecorderCtor || !canvas.captureStream) {
    throw new Error("Browser does not support client-side video export");
  }

  const mimeCandidates = [
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  const mimeType =
    mimeCandidates.find((candidate) =>
      MediaRecorderCtor.isTypeSupported(candidate),
    ) ?? "video/webm";

  const stream = canvas.captureStream(VIDEO_FPS);

  try {
    const recorder = new MediaRecorderCtor(stream, {
      mimeType,
      videoBitsPerSecond: 4_500_000,
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const stopPromise = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("MediaRecorder export failed"));
    });

    const frameStepMs = 1000 / VIDEO_FPS;

    const totalFrames = Math.max(
      1,
      Math.ceil(params.timeline.totalDurationMs / frameStepMs),
    );

    recorder.start();
    const startedAt = performance.now();

    try {
      for (let frame = 0; frame < totalFrames; frame += 1) {
        throwIfAborted(params.signal);

        renderFrame(ctx, params.timeline, frame * frameStepMs, params.layout, {
          ...params.renderOptions,
          reducedMotion: false,
        });

        params.onProgress?.({
          phase: "encoding",
          completedFrames: frame + 1,
          totalFrames,
          progress: (frame + 1) / totalFrames,
        });

        const nextFrameAt = startedAt + (frame + 1) * frameStepMs;

        await new Promise<void>((resolve) => {
          window.setTimeout(
            resolve,
            Math.max(0, nextFrameAt - performance.now()),
          );
        });
      }
    } finally {
      if (recorder.state !== "inactive") recorder.stop();
    }

    await stopPromise;
    throwIfAborted(params.signal);

    const extension = mimeType.includes("mp4") ? "mp4" : "webm";

    return {
      blob: new Blob(chunks, { type: mimeType }),
      filename: buildExportFilename(params.battleId, params.layout, extension),
      mimeType,
      extension,
    };
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
};

export const exportReplayToMp4 = async (
  params: ReplayExportParams,
): Promise<ReplayExportResult> => {
  const { width, height } = REPLAY_VIDEO_DIMENSIONS[params.layout];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not initialize 2D canvas context");

  const videoConfig = await pickSupportedVideoConfig(width, height);

  if (!videoConfig) {
    return exportWithMediaRecorder(params, canvas, ctx);
  }

  params.onProgress?.({
    phase: "preparing",
    completedFrames: 0,
    totalFrames: 1,
    progress: 0,
  });

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  throwIfAborted(params.signal);

  const target = new ArrayBufferTarget();

  const muxer = new Muxer({
    target,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
    video: {
      codec: "avc",
      width,
      height,
    },
  });

  let videoError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      videoError = error instanceof Error ? error : new Error(String(error));
    },
  });

  videoEncoder.configure(videoConfig);

  const frameStepMs = 1000 / VIDEO_FPS;
  const frameDurationUs = Math.round(1_000_000 / VIDEO_FPS);

  const totalFrames = Math.max(
    1,
    Math.ceil(params.timeline.totalDurationMs / frameStepMs),
  );

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      throwIfAborted(params.signal);

      if (videoError) throw videoError;

      while (videoEncoder.encodeQueueSize > 8) {
        await yieldToMainThread();
        throwIfAborted(params.signal);
      }

      renderFrame(ctx, params.timeline, frame * frameStepMs, params.layout, {
        ...params.renderOptions,
        reducedMotion: false,
      });

      const videoFrame = new VideoFrame(canvas, {
        timestamp: frame * frameDurationUs,
        duration: frameDurationUs,
      });

      videoEncoder.encode(videoFrame, {
        keyFrame: frame % KEYFRAME_INTERVAL === 0,
      });
      videoFrame.close();

      if (frame % 4 === 0 || frame === totalFrames - 1) {
        params.onProgress?.({
          phase: "encoding",
          completedFrames: frame + 1,
          totalFrames,
          progress: ((frame + 1) / totalFrames) * 0.9,
        });
        await yieldToMainThread();
      }
    }

    await videoEncoder.flush();

    if (videoError) throw videoError;

    params.onProgress?.({
      phase: "muxing",
      completedFrames: totalFrames,
      totalFrames,
      progress: 0.94,
    });

    muxer.finalize();
  } finally {
    if (videoEncoder.state !== "closed") videoEncoder.close();
  }

  throwIfAborted(params.signal);

  params.onProgress?.({
    phase: "muxing",
    completedFrames: totalFrames,
    totalFrames,
    progress: 1,
  });

  return {
    blob: new Blob([target.buffer], { type: "video/mp4" }),
    filename: buildExportFilename(params.battleId, params.layout, "mp4"),
    mimeType: "video/mp4",
    extension: "mp4",
  };
};
