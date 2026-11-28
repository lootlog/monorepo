import type {
  ReplayLayout,
  ReplayParticipant,
  ReplayTimeline,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplaySpriteMap } from "./replay-canvas-types";

export type ReplaySide = ReplayParticipant["side"];

export type ReplayScene = {
  readonly width: number;
  readonly height: number;
  readonly unit: number;
  readonly isVertical: boolean;
  readonly playTop: number;
  readonly playBottom: number;
  readonly spriteScale: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly rowGap: number;
  readonly xById: ReadonlyMap<string, number>;
  readonly feetY: (side: ReplaySide, row: number) => number;
};

const LOGICAL_SIZE: Record<ReplayLayout, { width: number; height: number }> = {
  "16:9": { width: 640, height: 360 },
  "9:16": { width: 360, height: 640 },
};

const PLAY_AREA: Record<ReplayLayout, { top: number; bottom: number }> = {
  "16:9": { top: 46, bottom: 340 },
  "9:16": { top: 120, bottom: 520 },
};

const DEFAULT_FRAME = { width: 32, height: 48 };

const HEAD_ROOM = 22;

const FRONT_ROW: Record<ReplaySide, number> = { left: 3, right: 2 };

const getRowDepth = (side: ReplaySide, row: number) =>
  side === "left" ? row - FRONT_ROW.left : FRONT_ROW.right - row;

export const getFrontwardDirection = (side: ReplaySide) =>
  side === "left" ? -1 : 1;

const getDepthRange = (timeline: ReplayTimeline, side: ReplaySide) => {
  let minDepth = 0;
  let maxDepth = 0;

  for (const snapshot of timeline.snapshots) {
    for (const participant of timeline.participants) {
      if (participant.side !== side) continue;

      const row = snapshot.rowById[participant.id];

      if (row === undefined) continue;

      const depth = getRowDepth(side, row);
      minDepth = Math.min(minDepth, depth);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return { closest: Math.min(0, minDepth), farthest: Math.min(2, maxDepth) };
};

const getFrameSize = (
  participants: readonly ReplayParticipant[],
  sprites: ReplaySpriteMap,
) => {
  let width = DEFAULT_FRAME.width;
  let height = DEFAULT_FRAME.height;

  for (const participant of participants) {
    const sprite = sprites.get(participant.icon);

    if (!sprite) continue;

    width = Math.max(width, sprite.frameWidth);
    height = Math.max(height, sprite.frameHeight);
  }

  return { width, height };
};

const pickSpriteScale = (
  layout: ReplayLayout,
  teamSize: number,
  frame: { width: number; height: number },
) => {
  const { width } = LOGICAL_SIZE[layout];
  const { top, bottom } = PLAY_AREA[layout];
  const preferred = teamSize === 1 ? 3 : 2;
  const fitsRow = Math.floor((width * 0.92) / teamSize / (frame.width + 6));
  const fitsHeight = Math.floor(((bottom - top) * 0.42) / frame.height);

  return Math.max(1, Math.min(preferred, fitsRow, fitsHeight));
};

const computeXPositions = (
  participants: readonly ReplayParticipant[],
  width: number,
  spriteWidth: number,
) => {
  const xById = new Map<string, number>();

  const isDuel = participants.every(
    (participant) => participant.teamSize === 1,
  );

  for (const participant of participants) {
    const count = participant.teamSize;
    const spacing = Math.min(spriteWidth + 14, (width * 0.92) / count);
    const centerOffset = (participant.slotIndex - (count - 1) / 2) * spacing;
    const duelOffset = isDuel ? (participant.side === "left" ? -1 : 1) * 34 : 0;

    xById.set(
      participant.id,
      Math.round(width / 2 + centerOffset + duelOffset),
    );
  }

  return xById;
};

const buildScene = (
  timeline: ReplayTimeline,
  layout: ReplayLayout,
  canvasWidth: number,
  sprites: ReplaySpriteMap,
): ReplayScene => {
  const { width, height } = LOGICAL_SIZE[layout];
  const { top, bottom } = PLAY_AREA[layout];
  const frame = getFrameSize(timeline.participants, sprites);

  const teamSize = Math.max(
    1,
    ...timeline.participants.map((participant) => participant.teamSize),
  );

  const spriteScale = pickSpriteScale(layout, teamSize, frame);
  const spriteHeight = frame.height * spriteScale;
  const enemyRange = getDepthRange(timeline, "right");
  const allyRange = getDepthRange(timeline, "left");
  const enemyDepth = enemyRange.farthest;
  const allyDepth = allyRange.farthest;
  const advance = -(enemyRange.closest + allyRange.closest);
  const available = bottom - top - HEAD_ROOM - spriteHeight;
  const idealRowGap = spriteHeight * 0.42;
  const idealFrontGap = spriteHeight * 0.92 + 12 + advance * idealRowGap;
  const desired = idealFrontGap + (enemyDepth + allyDepth) * idealRowGap;
  const fit = Math.min(1, available / desired);
  const frontGap = idealFrontGap * fit;
  const rowGap = idealRowGap * fit;
  const used = frontGap + (enemyDepth + allyDepth) * rowGap;

  const enemyFrontFeet =
    top +
    HEAD_ROOM +
    spriteHeight +
    enemyDepth * rowGap +
    (available - used) / 2;

  const feetY = (side: ReplaySide, row: number) => {
    const depth = getRowDepth(side, row);

    return side === "right"
      ? enemyFrontFeet - depth * rowGap
      : enemyFrontFeet + frontGap + depth * rowGap;
  };

  return {
    width,
    height,
    unit: canvasWidth / width,
    isVertical: layout === "9:16",
    playTop: top,
    playBottom: bottom,
    spriteScale,
    frameWidth: frame.width,
    frameHeight: frame.height,
    rowGap,
    xById: computeXPositions(
      timeline.participants,
      width,
      frame.width * spriteScale,
    ),
    feetY,
  };
};

const sceneCache = new WeakMap<ReplayTimeline, Map<string, ReplayScene>>();

export const getReplayScene = (
  timeline: ReplayTimeline,
  layout: ReplayLayout,
  canvasWidth: number,
  sprites: ReplaySpriteMap,
): ReplayScene => {
  const key = `${layout}:${canvasWidth}:${sprites.size}`;
  const cached = sceneCache.get(timeline)?.get(key);

  if (cached) return cached;

  const scene = buildScene(timeline, layout, canvasWidth, sprites);
  const byKey = sceneCache.get(timeline) ?? new Map<string, ReplayScene>();
  byKey.set(key, scene);
  sceneCache.set(timeline, byKey);

  return scene;
};
