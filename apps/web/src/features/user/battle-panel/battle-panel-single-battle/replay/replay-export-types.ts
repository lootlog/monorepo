import type {
  ReplayLayout,
  ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayRenderOptions } from "./replay-canvas-types";

export type ReplayExportFormat = "mp4" | "gif";

export type ReplayExportProgress = {
  readonly phase: "preparing" | "encoding" | "muxing";
  readonly completedFrames: number;
  readonly totalFrames: number;
  readonly progress: number;
};

export type ReplayExportResult = {
  readonly blob: Blob;
  readonly filename: string;
  readonly mimeType: string;
  readonly extension: "mp4" | "webm" | "gif";
};

export type ReplayExportParams = {
  readonly battleId: string;
  readonly timeline: ReplayTimeline;
  readonly layout: ReplayLayout;
  readonly renderOptions: ReplayRenderOptions;
  readonly includeAudio?: boolean;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ReplayExportProgress) => void;
};

export const buildExportFilename = (
  battleId: string,
  layout: ReplayLayout,
  extension: "mp4" | "webm" | "gif",
): string => {
  const suffix = layout === "9:16" ? "shorts" : "clip";

  const safeId =
    battleId.replace(/[^a-z0-9_-]/giu, "").slice(0, 12) || "battle";

  return `lootlog-replay-${safeId}-${suffix}.${extension}`;
};

export const downloadReplayBlob = (result: ReplayExportResult): void => {
  const objectUrl = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = result.filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
};

export const yieldToMainThread = (): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });

export const throwIfAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted) {
    throw new DOMException("Replay export cancelled", "AbortError");
  }
};
