import {
  REPLAY_IMPACT_FRACTION,
  type ReplayEvent,
  type ReplayLegendaryKind,
} from "@lootlog/battle-processor/replay-timeline";
import {
  getBodyPoint,
  paintRing,
  paintSparks,
  pixel,
  type Point,
} from "./replay-effect-primitives";
import { clamp01, createSeededRandom, easeOutCubic } from "./replay-motion";
import type { ReplayScene } from "./replay-scene-layout";
import type { WarriorPoseMap } from "./replay-warrior-painter";

type LegendaryProcEvent = Extract<ReplayEvent, { kind: "legendary_proc" }>;

type LegendaryPalette = {
  readonly main: string;
  readonly light: string;
  readonly dark: string;
};

type LegendaryEffect = {
  readonly seed: string;
  readonly origin: Point;
  readonly toward: Point | null;
  readonly elapsedMs: number;
  readonly life: number;
  readonly palette: LegendaryPalette;
};

type LegendaryMotif =
  | "impact"
  | "pillar"
  | "flare"
  | "guard"
  | "dome"
  | "hex"
  | "bleed"
  | "flames"
  | "pierce"
  | "pulse";

type LegendaryStyle = {
  readonly motif: LegendaryMotif;
  readonly strikesTarget: boolean;
  readonly palette: LegendaryPalette;
};

const STRIKE_LIFE_MS = 520;

const AURA_LIFE_MS = 820;

const LEGENDARY_STYLES: Record<ReplayLegendaryKind, LegendaryStyle> = {
  veryCrit: {
    motif: "impact",
    strikesTarget: true,
    palette: { main: "#ff4e91", light: "#fff0f6", dark: "#ffd24a" },
  },
  lastHeal: {
    motif: "pillar",
    strikesTarget: false,
    palette: { main: "#6ff07a", light: "#eaffea", dark: "#2fae52" },
  },
  holyTouch: {
    motif: "pillar",
    strikesTarget: false,
    palette: { main: "#ffe08a", light: "#ffffff", dark: "#ffc44d" },
  },
  glare: {
    motif: "flare",
    strikesTarget: true,
    palette: { main: "#fff6c8", light: "#ffffff", dark: "#ffd24a" },
  },
  critShield: {
    motif: "guard",
    strikesTarget: false,
    palette: { main: "#7fb8ff", light: "#e6f2ff", dark: "#2b4f8a" },
  },
  facade: {
    motif: "dome",
    strikesTarget: false,
    palette: { main: "#b9c8d8", light: "#ffffff", dark: "#56677a" },
  },
  curse: {
    motif: "hex",
    strikesTarget: true,
    palette: { main: "#b46bff", light: "#e9d2ff", dark: "#3a1560" },
  },
  anguish: {
    motif: "bleed",
    strikesTarget: true,
    palette: { main: "#e0453a", light: "#ff9d94", dark: "#7a1410" },
  },
  cleanse: {
    motif: "flames",
    strikesTarget: false,
    palette: { main: "#ff8a2b", light: "#fff1a8", dark: "#ff4d00" },
  },
  frenzy: {
    motif: "flames",
    strikesTarget: false,
    palette: { main: "#ff3b30", light: "#ffb36b", dark: "#8a0f0a" },
  },
  puncture: {
    motif: "pierce",
    strikesTarget: true,
    palette: { main: "#9fe8ff", light: "#ffffff", dark: "#3d7fb0" },
  },
  retaliation: {
    motif: "pulse",
    strikesTarget: false,
    palette: { main: "#ff6a3d", light: "#ffd0a8", dark: "#a8320f" },
  },
  unknown: {
    motif: "pulse",
    strikesTarget: false,
    palette: { main: "#ffd24a", light: "#fff4c2", dark: "#ff9f1c" },
  },
};

export const getLegendaryColor = (kind: ReplayLegendaryKind) =>
  LEGENDARY_STYLES[kind].palette.main;

const sparkColors = (palette: LegendaryPalette) => [
  palette.main,
  palette.light,
  palette.dark,
];

const getDirection = (effect: LegendaryEffect): Point => {
  if (!effect.toward) return { x: 0, y: -1 };

  const dx = effect.toward.x - effect.origin.x;
  const dy = effect.toward.y - effect.origin.y;
  const length = Math.hypot(dx, dy) || 1;

  return { x: dx / length, y: dy / length };
};

const strokeLine = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  color: string,
) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
};

const paintImpact = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
) => {
  const { origin, life, palette, seed } = effect;
  const random = createSeededRandom(`${seed}:rays`);
  const burst = easeOutCubic(life);
  const rayCount = 10;

  ctx.globalAlpha = 1 - life;

  for (let index = 0; index < rayCount; index += 1) {
    const angle = (index / rayCount) * Math.PI * 2 + random() * 0.4;
    const reach = 22 + random() * 26;
    const inner = 6 + reach * burst * 0.75;
    const outer = 8 + reach * burst;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle) * 0.7;

    const from = { x: origin.x + cos * inner, y: origin.y + sin * inner };
    const to = { x: origin.x + cos * outer, y: origin.y + sin * outer };

    strokeLine(ctx, from, to, 3, palette.main);
    strokeLine(ctx, from, to, 1, palette.light);
  }

  if (life < 0.3) {
    const core = 13 * (1 - life / 0.3);

    ctx.globalAlpha = 1 - life / 0.3;
    ctx.fillStyle = palette.light;
    ctx.beginPath();
    ctx.ellipse(origin.x, origin.y, core, core, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  paintRing(ctx, origin, life, palette.main, 46);
  paintRing(ctx, origin, clamp01(life * 1.5), palette.light, 28);
  paintRing(ctx, origin, clamp01(life * 0.8), palette.dark, 60);
  paintSparks(
    ctx,
    `${seed}:impact`,
    origin,
    effect.elapsedMs,
    28,
    sparkColors(palette),
    44,
    10,
  );
};

const paintRisingMotes = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
  count: number,
  width: number,
  height: number,
) => {
  const random = createSeededRandom(`${effect.seed}:motes`);

  for (let index = 0; index < count; index += 1) {
    const offsetX = (random() - 0.5) * width;
    const delay = random() * 0.45;
    const sway = random() * Math.PI * 2;
    const moteLife = clamp01((effect.life - delay) / 0.55);

    if (moteLife <= 0 || moteLife >= 1) continue;

    ctx.globalAlpha = 1 - moteLife;
    pixel(
      ctx,
      effect.origin.x + offsetX + Math.sin(sway + moteLife * 6) * 2,
      effect.origin.y + 16 - moteLife * height,
      index % 3 === 0 ? 3 : 2,
      index % 2 === 0 ? effect.palette.main : effect.palette.light,
    );
  }

  ctx.globalAlpha = 1;
};

const paintPillar = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
) => {
  const { origin, life, palette } = effect;
  const strength = Math.sin(life * Math.PI);
  const top = origin.y - 64;
  const height = 84;

  for (const [width, color, alpha] of [
    [20, palette.main, 0.22],
    [10, palette.main, 0.4],
    [3, palette.light, 0.85],
  ] as const) {
    ctx.globalAlpha = alpha * strength;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(origin.x - width / 2), top, width, height);
  }

  ctx.globalAlpha = strength;
  ctx.strokeStyle = palette.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(origin.x, top + 26, 11, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  paintRing(ctx, { x: origin.x, y: origin.y + 18 }, life, palette.dark, 26);
  paintRisingMotes(ctx, effect, 14, 26, 70);
};

const paintFlare = (ctx: CanvasRenderingContext2D, effect: LegendaryEffect) => {
  const { origin, life, palette } = effect;
  const reach = 10 + 30 * easeOutCubic(life);

  ctx.globalAlpha = 1 - life;

  for (const [dx, dy, scale] of [
    [1, 0, 1],
    [0, 1, 0.7],
    [0.7, 0.7, 0.4],
    [0.7, -0.7, 0.4],
  ] as const) {
    const from = {
      x: origin.x - dx * reach * scale,
      y: origin.y - dy * reach * scale,
    };

    const to = {
      x: origin.x + dx * reach * scale,
      y: origin.y + dy * reach * scale,
    };

    strokeLine(ctx, from, to, 3, palette.dark);
    strokeLine(ctx, from, to, 1, palette.light);
  }

  ctx.fillStyle = palette.light;
  ctx.beginPath();
  ctx.ellipse(origin.x, origin.y, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  paintSparks(
    ctx,
    `${effect.seed}:flare`,
    origin,
    effect.elapsedMs,
    10,
    sparkColors(palette),
    20,
    0,
  );
};

const paintWard = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
  span: number,
) => {
  const { origin, life, palette } = effect;
  const direction = getDirection(effect);
  const facing = Math.atan2(direction.y, direction.x);
  const radius = 17 + 5 * easeOutCubic(clamp01(life * 3));
  const strength = life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85;

  ctx.globalAlpha = strength * 0.2;
  ctx.fillStyle = palette.main;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, radius, facing - span, facing + span);
  ctx.fill();

  for (const [width, color] of [
    [5, palette.dark],
    [3, palette.main],
    [1, palette.light],
  ] as const) {
    ctx.globalAlpha = strength;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius, facing - span, facing + span);
    ctx.stroke();
  }

  const glintAngle = facing - span + span * 2 * clamp01(life * 1.6);

  pixel(
    ctx,
    origin.x + Math.cos(glintAngle) * radius,
    origin.y + Math.sin(glintAngle) * radius,
    3,
    palette.light,
  );
  ctx.globalAlpha = 1;
};

const paintHex = (ctx: CanvasRenderingContext2D, effect: LegendaryEffect) => {
  const { origin, life, palette } = effect;
  const random = createSeededRandom(`${effect.seed}:hex`);

  paintRing(ctx, origin, 1 - life, palette.dark, 30);

  ctx.globalAlpha = 1 - life ** 2;

  for (let index = 0; index < 12; index += 1) {
    const angle = random() * Math.PI * 2 + life * Math.PI * 3;
    const radius = (26 + random() * 8) * (1 - easeOutCubic(life)) + 3;

    pixel(
      ctx,
      origin.x + Math.cos(angle) * radius,
      origin.y + Math.sin(angle) * radius * 0.6 - life * 8,
      index % 4 === 0 ? 3 : 2,
      index % 3 === 0 ? palette.light : palette.main,
    );
  }

  ctx.globalAlpha = 1;
};

const paintBleed = (ctx: CanvasRenderingContext2D, effect: LegendaryEffect) => {
  const { origin, life, palette } = effect;
  const random = createSeededRandom(`${effect.seed}:bleed`);

  ctx.globalAlpha = 1 - life ** 3;

  for (let index = 0; index < 11; index += 1) {
    const offsetX = (random() - 0.5) * 26;
    const drift = (random() - 0.5) * 10;
    const weight = 26 + random() * 22;
    const size = random() > 0.6 ? 3 : 2;

    pixel(
      ctx,
      origin.x + offsetX + drift * life,
      origin.y - 6 + weight * life * life,
      size,
      index % 3 === 0 ? palette.light : palette.main,
    );
    pixel(
      ctx,
      origin.x + offsetX + drift * life,
      origin.y - 8 + weight * life * life,
      size - 1,
      palette.dark,
    );
  }

  ctx.globalAlpha = 1;
  paintSparks(
    ctx,
    `${effect.seed}:bleed`,
    origin,
    effect.elapsedMs,
    8,
    [palette.main, palette.dark],
    14,
    18,
  );
};

const paintFlames = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
) => {
  const { origin, life, palette } = effect;
  const random = createSeededRandom(`${effect.seed}:flames`);

  paintRing(ctx, { x: origin.x, y: origin.y + 18 }, life, palette.main, 24);

  for (let index = 0; index < 18; index += 1) {
    const offsetX = (random() - 0.5) * 30;
    const delay = random() * 0.5;
    const height = 30 + random() * 26;
    const flameLife = clamp01((life - delay) / 0.5);

    if (flameLife <= 0 || flameLife >= 1) continue;

    const color =
      flameLife < 0.3
        ? palette.light
        : flameLife < 0.7
          ? palette.main
          : palette.dark;

    ctx.globalAlpha = 1 - flameLife;
    pixel(
      ctx,
      origin.x + offsetX * (1 - flameLife * 0.5),
      origin.y + 18 - flameLife * height,
      flameLife < 0.5 ? 3 : 2,
      color,
    );
  }

  ctx.globalAlpha = 1;
};

const paintPierce = (
  ctx: CanvasRenderingContext2D,
  effect: LegendaryEffect,
) => {
  const { origin, life, palette } = effect;
  const inward = getDirection(effect);
  const thrust = easeOutCubic(clamp01(life * 2.2));

  const from = { x: origin.x + inward.x * 30, y: origin.y + inward.y * 30 };

  const to = {
    x: origin.x - inward.x * 34 * thrust,
    y: origin.y - inward.y * 34 * thrust,
  };

  ctx.globalAlpha = 1 - life;
  strokeLine(ctx, from, to, 5, palette.dark);
  strokeLine(ctx, from, to, 3, palette.main);
  strokeLine(ctx, from, to, 1, palette.light);
  ctx.globalAlpha = 1;

  paintSparks(
    ctx,
    `${effect.seed}:pierce`,
    to,
    effect.elapsedMs,
    9,
    sparkColors(palette),
    16,
    6,
  );
};

const paintPulse = (ctx: CanvasRenderingContext2D, effect: LegendaryEffect) => {
  const { origin, life, palette } = effect;

  paintRing(ctx, origin, life, palette.main, 30);
  paintRing(ctx, origin, clamp01(life * 1.4), palette.light, 20);
  paintSparks(
    ctx,
    `${effect.seed}:legend`,
    origin,
    effect.elapsedMs,
    14,
    sparkColors(palette),
    28,
    -6,
  );
};

const MOTIF_PAINTERS: Record<
  LegendaryMotif,
  (ctx: CanvasRenderingContext2D, effect: LegendaryEffect) => void
> = {
  impact: paintImpact,
  pillar: paintPillar,
  flare: paintFlare,
  guard: (ctx, effect) => {
    paintWard(ctx, effect, Math.PI * 0.38);
  },
  dome: (ctx, effect) => {
    paintWard(ctx, effect, Math.PI);
  },
  hex: paintHex,
  bleed: paintBleed,
  flames: paintFlames,
  pierce: paintPierce,
  pulse: paintPulse,
};

export const paintLegendaryEffect = (
  ctx: CanvasRenderingContext2D,
  event: LegendaryProcEvent,
  timeMs: number,
  poses: WarriorPoseMap,
  scene: ReplayScene,
) => {
  const style = LEGENDARY_STYLES[event.legendaryKind];
  const owner = getBodyPoint(poses, event.actorId, scene);
  const target = getBodyPoint(poses, event.targetId, scene);
  const strikes = style.strikesTarget && target !== null;
  const origin = strikes ? target : owner;

  if (!origin) return;

  const startMs = strikes
    ? event.tStart + (event.tEnd - event.tStart) * REPLAY_IMPACT_FRACTION
    : event.tStart;

  const lifeMs = strikes ? STRIKE_LIFE_MS : AURA_LIFE_MS;
  const elapsedMs = timeMs - startMs;

  if (elapsedMs < 0 || elapsedMs >= lifeMs) return;

  MOTIF_PAINTERS[style.motif](ctx, {
    seed: event.id,
    origin,
    toward: strikes ? owner : target,
    elapsedMs,
    life: elapsedMs / lifeMs,
    palette: style.palette,
  });
};
