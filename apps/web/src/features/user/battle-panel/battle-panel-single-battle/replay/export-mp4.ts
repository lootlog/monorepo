import {
  REPLAY_AUDIO_SAMPLE_RATE,
  renderReplayAudioTrack,
} from "./replay-audio";
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

const pickSupportedAudioConfig =
  async (): Promise<AudioEncoderConfig | null> => {
    const AudioEncoderCtor = globalThis.AudioEncoder;

    if (!AudioEncoderCtor || !globalThis.AudioData) return null;

    const config: AudioEncoderConfig = {
      codec: "mp4a.40.2",
      numberOfChannels: 1,
      sampleRate: REPLAY_AUDIO_SAMPLE_RATE,
      bitrate: 96_000,
    };

    try {
      const support = await AudioEncoderCtor.isConfigSupported(config);

      return support.supported ? config : null;
    } catch {
      return null;
    }
  };

const encodeAudioBuffer = async (
  audioBuffer: AudioBuffer,
  audioConfig: AudioEncoderConfig,
  onChunk: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void,
  signal: AbortSignal | undefined,
): Promise<void> => {
  let encodingError: Error | null = null;

  const audioEncoder = new AudioEncoder({
    output: onChunk,
    error: (error) => {
      encodingError = error instanceof Error ? error : new Error(String(error));
    },
  });

  audioEncoder.configure(audioConfig);

  const channelData = audioBuffer.getChannelData(0);
  const chunkFrames = 1024;

  try {
    for (let offset = 0; offset < channelData.length; offset += chunkFrames) {
      throwIfAborted(signal);

      if (encodingError) throw encodingError;

      const slice = channelData.subarray(
        offset,
        Math.min(channelData.length, offset + chunkFrames),
      );

      const copy = new Float32Array(slice.length);
      copy.set(slice);

      const audioData = new AudioData({
        format: "f32",
        sampleRate: audioBuffer.sampleRate,
        numberOfFrames: copy.length,
        numberOfChannels: 1,
        timestamp: Math.round((offset / audioBuffer.sampleRate) * 1_000_000),
        data: copy,
      });

      audioEncoder.encode(audioData);
      audioData.close();
    }

    await audioEncoder.flush();
  } finally {
    if (audioEncoder.state !== "closed") audioEncoder.close();
  }

  if (encodingError) throw encodingError;
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

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, frameStepMs);
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

  const audioConfig = params.includeAudio
    ? await pickSupportedAudioConfig()
    : null;

  const audioBuffer =
    audioConfig !== null ? await renderReplayAudioTrack(params.timeline) : null;

  throwIfAborted(params.signal);

  const target = new ArrayBufferTarget();
  const hasAudioTrack = audioBuffer !== null && audioConfig !== null;

  const muxer = new Muxer({
    target,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
    video: {
      codec: "avc",
      width,
      height,
    },
    audio: hasAudioTrack
      ? {
          codec: "aac",
          numberOfChannels: 1,
          sampleRate: REPLAY_AUDIO_SAMPLE_RATE,
        }
      : undefined,
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

    if (audioBuffer && audioConfig) {
      await encodeAudioBuffer(
        audioBuffer,
        audioConfig,
        (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        params.signal,
      );
    }

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
