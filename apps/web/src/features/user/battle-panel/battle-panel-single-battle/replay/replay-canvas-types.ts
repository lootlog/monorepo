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
  readonly image: CanvasImageSource;
  readonly flash: CanvasImageSource;
  readonly faded: CanvasImageSource;
  readonly isSheet: boolean;
  readonly frameWidth: number;
  readonly frameHeight: number;
};

export type ReplaySpriteMap = ReadonlyMap<string, ReplayLoadedSprite>;

export type ReplayAssets = {
  readonly sprites: ReplaySpriteMap;
  readonly battleground: HTMLImageElement | null;
};

export type ReplayRenderLabels = {
  readonly turn: string;
  readonly evade: string;
  readonly block: string;
  readonly parry: string;
  readonly arrowBlock: string;
  readonly pierce: string;
  readonly crit: string;
  readonly flee: string;
  readonly mvp: string;
  readonly totalTurns: string;
  readonly damageDealt: string;
  readonly yourTeam: string;
  readonly enemyTeam: string;
  readonly watermark: string;
  readonly outcomes: Record<ReplayOutcomeKind, string>;
  readonly legendary: Record<ReplayLegendaryKind, string>;
};

export type ReplayRenderOptions = {
  readonly assets: ReplayAssets;
  readonly labels: ReplayRenderLabels;
  readonly reducedMotion?: boolean;
};
