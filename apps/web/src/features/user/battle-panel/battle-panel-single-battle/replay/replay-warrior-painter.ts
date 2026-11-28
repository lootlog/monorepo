import {
  REPLAY_IMPACT_FRACTION,
  type ReplayAttackEvent,
  type ReplayEvent,
  type ReplayParticipant,
  type ReplayStateAtTime,
  type ReplayStatusTag,
} from "@lootlog/battle-processor/replay-timeline";
import type {
  ReplayLoadedSprite,
  ReplaySpriteMap,
} from "./replay-canvas-types";
import { getCelebration, isCelebrating, SHEET_ROW } from "./replay-celebration";
import { drawPixelText, fitPixelText } from "./replay-pixel-text";
import { getFrontwardDirection, type ReplayScene } from "./replay-scene-layout";
import {
  clamp01,
  easeInOutQuad,
  easeOutCubic,
  getEventProgress,
} from "./replay-motion";

type WarriorPose = {
  readonly x: number;
  readonly feetY: number;
  readonly flash: number;
  readonly walkFrame: number;
  readonly facingRow: number;
  readonly lift: number;
  readonly isActing: boolean;
  readonly opacity: number;
  readonly deathFade: number;
};

export type WarriorPoseMap = ReadonlyMap<string, WarriorPose>;

const STATUS_COLORS: Record<ReplayStatusTag, string> = {
  stun: "#f5d142",
  freeze: "#7fd4ff",
  poison: "#7fdc5a",
  wound: "#e0453a",
  burn: "#ff8a2b",
};

const HP_COLORS = {
  high: "#4fd65a",
  mid: "#f2c230",
  low: "#ec4a3c",
} as const;

const getBasePosition = (
  participant: ReplayParticipant,
  state: ReplayStateAtTime,
  scene: ReplayScene,
) => ({
  x: scene.xById.get(participant.id) ?? scene.width / 2,
  feetY: scene.feetY(
    participant.side,
    state.rowById[participant.id] ?? (participant.side === "left" ? 3 : 2),
  ),
});

type BasePosition = ReturnType<typeof getBasePosition>;

type PoseDraft = {
  dx: number;
  dy: number;
  flash: number;
  walking: boolean;
  isActing: boolean;
  opacity: number;
  deathFade: number;
};

type PoseContext = {
  readonly participant: ReplayParticipant;
  readonly base: BasePosition;
  readonly bases: ReadonlyMap<string, BasePosition>;
  readonly scene: ReplayScene;
  readonly reducedMotion: boolean;
};

const getLungeAmount = (progress: number) => {
  if (progress < 0.38) return easeOutCubic(progress / 0.38);

  if (progress < 0.55) return 1;

  return 1 - easeInOutQuad((progress - 0.55) / 0.45);
};

const applyAttackerMotion = (
  draft: PoseDraft,
  event: ReplayAttackEvent,
  progress: number,
  context: PoseContext,
) => {
  draft.isActing = true;
  const target = context.bases.get(event.targetId);

  if (!target || context.reducedMotion) return;

  const vx = target.x - context.base.x;
  const vy = target.feetY - context.base.feetY;
  const distance = Math.hypot(vx, vy) || 1;

  if (event.isRanged) {
    const recoil = Math.sin(clamp01(progress / 0.3) * Math.PI) * 3;
    draft.dx -= (vx / distance) * recoil;
    draft.dy -= (vy / distance) * recoil;

    return;
  }

  const spriteWidth = context.scene.frameWidth * context.scene.spriteScale;
  const reach = Math.max(0, distance - spriteWidth * 0.7);
  const lunge = getLungeAmount(progress);
  draft.dx += (vx / distance) * reach * lunge;
  draft.dy += (vy / distance) * reach * lunge;
  draft.walking ||= progress < 0.38 || progress > 0.55;
};

const applyTargetReaction = (
  draft: PoseDraft,
  event: ReplayAttackEvent,
  progress: number,
  context: PoseContext,
) => {
  if (progress < REPLAY_IMPACT_FRACTION) return;

  const reaction = clamp01((progress - REPLAY_IMPACT_FRACTION) / 0.32);
  const wave = Math.sin(reaction * Math.PI);

  if (event.isEvade) {
    if (!context.reducedMotion) draft.dx += wave * 12;

    return;
  }

  draft.flash = Math.max(
    draft.flash,
    (1 - reaction) * (event.isBlock ? 0.45 : 0.9),
  );

  const attacker = context.bases.get(event.actorId);

  if (!attacker || context.reducedMotion) return;

  const vx = context.base.x - attacker.x;
  const vy = context.base.feetY - attacker.feetY;
  const distance = Math.hypot(vx, vy) || 1;
  const knock = (event.isVeryCrit ? 11 : event.isCrit ? 6 : 3) * wave;
  draft.dx += (vx / distance) * knock;
  draft.dy += (vy / distance) * knock;
};

const applyEventToPose = (
  draft: PoseDraft,
  event: ReplayEvent,
  progress: number,
  context: PoseContext,
) => {
  const { participant, reducedMotion, scene } = context;
  const frontward = getFrontwardDirection(participant.side);

  switch (event.kind) {
    case "attack":
      if (event.actorId === participant.id) {
        applyAttackerMotion(draft, event, progress, context);
      } else if (event.targetId === participant.id) {
        applyTargetReaction(draft, event, progress, context);
      }

      return;
    case "step":
      if (event.actorId !== participant.id || progress >= 1) return;

      draft.isActing = true;
      draft.walking = true;

      if (!reducedMotion) {
        draft.dy += frontward * scene.rowGap * easeInOutQuad(progress);
      }

      return;
    case "heal":
    case "shield":
    case "legendary_proc":
      if (event.actorId === participant.id) draft.isActing = true;

      return;
    case "flee":
      if (event.actorId !== participant.id) return;

      draft.isActing = true;
      draft.walking = true;
      draft.opacity = 1 - progress;

      if (!reducedMotion) draft.dy -= frontward * 36 * progress;

      return;
    case "death":
      if (event.victimId === participant.id) {
        draft.deathFade = easeOutCubic(clamp01(progress / 0.6));
      }

      break;
    default:
      break;
  }
};

export const computeWarriorPoses = (
  participants: readonly ReplayParticipant[],
  state: ReplayStateAtTime,
  scene: ReplayScene,
  reducedMotion: boolean,
): WarriorPoseMap => {
  const bases = new Map(
    participants.map((participant) => [
      participant.id,
      getBasePosition(participant, state, scene),
    ]),
  );

  const poses = new Map<string, WarriorPose>();
  const walkFrame = Math.floor(state.timeMs / 130) % 4;

  for (const participant of participants) {
    const base = bases.get(participant.id);

    if (!base) continue;

    const context = { participant, base, bases, scene, reducedMotion };

    const draft: PoseDraft = {
      dx: 0,
      dy: 0,
      flash: 0,
      walking: false,
      isActing: false,
      opacity: 1,
      deathFade: state.deadIds.has(participant.id) ? 1 : 0,
    };

    for (const event of state.activeEvents) {
      applyEventToPose(
        draft,
        event,
        getEventProgress(event, state.timeMs),
        context,
      );
    }

    const celebration =
      state.victoryEvent &&
      isCelebrating(participant, state.victoryEvent, draft.deathFade > 0)
        ? getCelebration(
            participant,
            state.victoryEvent,
            state.timeMs,
            scene.spriteScale,
            reducedMotion,
          )
        : null;

    poses.set(participant.id, {
      x: base.x + draft.dx,
      feetY: base.feetY + draft.dy,
      flash: draft.flash,
      walkFrame: celebration?.walkFrame ?? (draft.walking ? walkFrame : 0),
      facingRow:
        celebration?.facingRow ??
        (participant.side === "left" ? SHEET_ROW.north : SHEET_ROW.south),
      lift: celebration?.lift ?? 0,
      isActing: draft.isActing,
      opacity: draft.opacity,
      deathFade: draft.deathFade,
    });
  }

  return poses;
};

const snap = (value: number, unit: number) => Math.round(value * unit) / unit;

const drawSpriteImage = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sprite: ReplayLoadedSprite,
  pose: Pick<WarriorPose, "walkFrame" | "facingRow">,
  left: number,
  top: number,
  scale: number,
) => {
  const { walkFrame, facingRow: directionRow } = pose;
  const sx = sprite.isSheet ? walkFrame * sprite.frameWidth : 0;
  const sy = sprite.isSheet ? directionRow * sprite.frameHeight : 0;

  ctx.drawImage(
    source,
    sx,
    sy,
    sprite.frameWidth,
    sprite.frameHeight,
    left,
    top,
    sprite.frameWidth * scale,
    sprite.frameHeight * scale,
  );
};

const PLACEHOLDER_ROWS = [
  "...####...",
  "..######..",
  "..######..",
  "...####...",
  ".########.",
  "##########",
  "##.####.##",
  "##.####.##",
  "...####...",
  "...#..#...",
  "...#..#...",
  "..##..##..",
];

const drawPlaceholder = (
  ctx: CanvasRenderingContext2D,
  participant: ReplayParticipant,
  x: number,
  feetY: number,
  scale: number,
) => {
  const pixel = scale * 3;
  const left = x - (PLACEHOLDER_ROWS[0]?.length ?? 10) * pixel * 0.5;
  const top = feetY - PLACEHOLDER_ROWS.length * pixel;
  ctx.fillStyle = participant.side === "left" ? "#2c3a2c" : "#3a2626";

  for (const [rowIndex, row] of PLACEHOLDER_ROWS.entries()) {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column] !== "#") continue;

      ctx.fillRect(left + column * pixel, top + rowIndex * pixel, pixel, pixel);
    }
  }
};

export const paintWarriors = (
  ctx: CanvasRenderingContext2D,
  participants: readonly ReplayParticipant[],
  poses: WarriorPoseMap,
  sprites: ReplaySpriteMap,
  scene: ReplayScene,
) => {
  const ordered = [...participants].sort(
    (a, b) => (poses.get(a.id)?.feetY ?? 0) - (poses.get(b.id)?.feetY ?? 0),
  );

  const scale = scene.spriteScale;

  for (const participant of ordered) {
    const pose = poses.get(participant.id);

    if (!pose || pose.opacity <= 0) continue;

    const x = snap(pose.x, scene.unit);
    const feetY = snap(pose.feetY, scene.unit);
    const sprite = sprites.get(participant.icon);
    const spriteWidth = (sprite?.frameWidth ?? scene.frameWidth) * scale;
    const spriteHeight = (sprite?.frameHeight ?? scene.frameHeight) * scale;
    const left = snap(x - spriteWidth / 2, scene.unit);
    const top = snap(feetY - pose.lift - spriteHeight, scene.unit);
    const aliveOpacity = pose.opacity * (1 - pose.deathFade);
    const shadowScale = 1 - Math.min(0.45, pose.lift / (spriteHeight * 0.6));

    ctx.save();
    ctx.globalAlpha = 0.42 * aliveOpacity + 0.18 * pose.deathFade;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(
      x,
      feetY - scale,
      spriteWidth * 0.34 * shadowScale,
      2.5 * scale * shadowScale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    if (!sprite) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, aliveOpacity);
      drawPlaceholder(ctx, participant, x, feetY, scale);
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (aliveOpacity > 0) {
      ctx.globalAlpha = aliveOpacity;
      drawSpriteImage(ctx, sprite.image, sprite, pose, left, top, scale);
    }

    if (pose.deathFade > 0) {
      ctx.globalAlpha = pose.deathFade * 0.7 * pose.opacity;
      drawSpriteImage(
        ctx,
        sprite.faded,
        sprite,
        { walkFrame: 0, facingRow: pose.facingRow },
        left,
        top,
        scale,
      );
    }

    if (pose.flash > 0) {
      ctx.globalAlpha = pose.flash;
      drawSpriteImage(ctx, sprite.flash, sprite, pose, left, top, scale);
    }

    ctx.restore();
  }
};

const getHpColor = (hp: number) =>
  hp > 50 ? HP_COLORS.high : hp > 25 ? HP_COLORS.mid : HP_COLORS.low;

export const paintPixelBar = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  hp: number,
  trailingHp: number,
) => {
  ctx.fillStyle = "#0b0705";
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = "#3a2b22";
  ctx.fillRect(left, top, width, height);

  const trailingWidth = Math.round(width * clamp01(trailingHp / 100) * 2) / 2;
  const hpWidth = Math.round(width * clamp01(hp / 100) * 2) / 2;

  if (trailingWidth > hpWidth) {
    ctx.fillStyle = "#fff1c9";
    ctx.fillRect(left, top, trailingWidth, height);
  }

  if (hpWidth > 0) {
    ctx.fillStyle = getHpColor(hp);
    ctx.fillRect(left, top, hpWidth, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(left, top, hpWidth, Math.max(1, height / 3));
  }
};

const paintStatusChips = (
  ctx: CanvasRenderingContext2D,
  statuses: readonly ReplayStatusTag[],
  left: number,
  top: number,
) => {
  for (const [index, status] of statuses.entries()) {
    const chipLeft = left + index * 5;
    ctx.fillStyle = "#0b0705";
    ctx.fillRect(chipLeft - 1, top - 1, 5, 5);
    ctx.fillStyle = STATUS_COLORS[status];
    ctx.fillRect(chipLeft, top, 3, 3);
  }
};

const paintTurnMarker = (
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
) => {
  ctx.fillStyle = "#0b0705";
  ctx.fillRect(x - 4, top - 1, 9, 2);
  ctx.fillRect(x - 3, top + 1, 7, 2);
  ctx.fillRect(x - 2, top + 3, 5, 2);
  ctx.fillStyle = "#ffd24a";
  ctx.fillRect(x - 3, top, 7, 1);
  ctx.fillRect(x - 2, top + 1, 5, 1);
  ctx.fillRect(x - 1, top + 2, 3, 1);
  ctx.fillRect(x, top + 3, 1, 1);
};

export const paintWarriorOverlays = (
  ctx: CanvasRenderingContext2D,
  participants: readonly ReplayParticipant[],
  poses: WarriorPoseMap,
  state: ReplayStateAtTime,
  sprites: ReplaySpriteMap,
  scene: ReplayScene,
) => {
  const scale = scene.spriteScale;
  const crowded = participants.some((participant) => participant.teamSize > 5);

  const nameSizes = scene.isVertical
    ? { crowded: 8, roomy: 11 }
    : { crowded: 7, roomy: 9 };

  const nameSize = crowded ? nameSizes.crowded : nameSizes.roomy;
  const barHeight = scale >= 3 ? 4 : 3;

  for (const participant of participants) {
    const pose = poses.get(participant.id);

    if (!pose || pose.opacity <= 0 || pose.deathFade >= 1) continue;

    const sprite = sprites.get(participant.icon);
    const spriteHeight = (sprite?.frameHeight ?? scene.frameHeight) * scale;
    const spriteWidth = (sprite?.frameWidth ?? scene.frameWidth) * scale;
    const x = snap(pose.x, scene.unit);
    const headY = snap(pose.feetY - spriteHeight, scene.unit);
    const barWidth = Math.max(24, Math.min(54, spriteWidth * 0.86));
    const barLeft = Math.round(x - barWidth / 2);
    const barTop = Math.round(headY - barHeight - 4);
    const visibility = pose.opacity * (1 - pose.deathFade);

    ctx.save();
    ctx.globalAlpha = visibility;

    paintPixelBar(
      ctx,
      barLeft,
      barTop,
      barWidth,
      barHeight,
      state.hpById[participant.id] ?? 100,
      state.trailingHpById[participant.id] ?? 100,
    );

    if ((state.shieldById[participant.id] ?? 0) > 0) {
      ctx.fillStyle = "#7fd4ff";
      ctx.fillRect(barLeft, barTop - 2, barWidth, 1);
    }

    paintStatusChips(
      ctx,
      state.statusesById[participant.id] ?? [],
      barLeft + barWidth + 3,
      barTop,
    );

    const label = fitPixelText(
      ctx,
      participant.name,
      Math.max(barWidth, spriteWidth) + 18,
      nameSize,
      500,
    );

    drawPixelText(ctx, label, x, barTop - 3, {
      size: nameSize,
      weight: 500,
      color: participant.isUser ? "#ffd769" : "#f4ead8",
      align: "center",
      outlineWidth: 2.5,
    });

    if (pose.isActing) {
      paintTurnMarker(
        ctx,
        x,
        barTop - nameSize - 7 + Math.round(Math.sin(state.timeMs / 90)),
      );
    }

    ctx.restore();
  }
};
