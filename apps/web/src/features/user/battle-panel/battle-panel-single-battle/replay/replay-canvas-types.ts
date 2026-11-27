import type {
  ReplayLayout,
  ReplayLegendaryKind,
  ReplayOutcomeKind,
} from "@lootlog/battle-processor/replay-timeline";

export type ReplayCanvasDimensions = {
  readonly width: number;
  readonly height: number;
};

export const REPLAY_VIDEO_DIMENSIONS: Record<
  ReplayLayout,
  ReplayCanvasDimensions
> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 1080, height: 1920 },
};

export const REPLAY_GIF_DIMENSIONS: Record<
  ReplayLayout,
  ReplayCanvasDimensions
> = {
  "16:9": { width: 640, height: 360 },
  "9:16": { width: 360, height: 640 },
};

export type ReplayLoadedSprite = {
  readonly image: HTMLImageElement;
  readonly isSheet: boolean;
  readonly frameWidth: number;
  readonly frameHeight: number;
};

export type ReplaySpriteMap = ReadonlyMap<string, ReplayLoadedSprite>;

export type ReplayRenderLabels = {
  readonly turnCounter: string;
  readonly evade: string;
  readonly block: string;
  readonly parry: string;
  readonly arrowBlock: string;
  readonly pierce: string;
  readonly counter: string;
  readonly flee: string;
  readonly mvp: string;
  readonly totalTurns: string;
  readonly damageShort: string;
  readonly watermark: string;
  readonly logStart: string;
  readonly stepLog: string;
  readonly diedLog: string;
  readonly effectLog: string;
  readonly shieldLog: string;
  readonly outcomes: Record<ReplayOutcomeKind, string>;
  readonly legendary: Record<ReplayLegendaryKind, string>;
};

export type ReplayRenderOptions = {
  readonly sprites: ReplaySpriteMap;
  readonly labels: ReplayRenderLabels;
  readonly reducedMotion?: boolean;
};

export type ReplayAnchor = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
};
