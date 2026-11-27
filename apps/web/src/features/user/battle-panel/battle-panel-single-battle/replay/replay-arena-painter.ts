import type {
  ReplayArenaTheme,
  ReplayLayout,
} from "@lootlog/battle-processor/replay-timeline";

export type ArenaAtmospherePalette = {
  readonly skyTop: string;
  readonly floorMid: string;
  readonly floorEdge: string;
  readonly stageGlow: string;
  readonly brazierCore: string;
  readonly brazierGlow: string;
  readonly rimLightLeft: string;
  readonly rimLightRight: string;
  readonly runeStroke: string;
  readonly runeBright: string;
  readonly laneStroke: string;
  readonly centerLine: string;
  readonly particleGlow: string;
  readonly borderLight: string;
  readonly borderMid: string;
  readonly borderDark: string;
};

export const ARENA_PALETTES: Record<ReplayArenaTheme, ArenaAtmospherePalette> =
  {
    pvp: {
      skyTop: "#111626",
      floorMid: "#1e2438",
      floorEdge: "#090b13",
      stageGlow: "rgba(245, 185, 92, 0.22)",
      brazierCore: "#fef08a",
      brazierGlow: "rgba(255, 148, 46, 0.34)",
      rimLightLeft: "rgba(255, 174, 66, 0.22)",
      rimLightRight: "rgba(96, 165, 250, 0.18)",
      runeStroke: "rgba(234, 194, 118, 0.2)",
      runeBright: "rgba(253, 224, 138, 0.42)",
      laneStroke: "rgba(226, 204, 162, 0.09)",
      centerLine: "rgba(250, 204, 108, 0.44)",
      particleGlow: "#ffd98c",
      borderLight: "#fce29d",
      borderMid: "#b8893c",
      borderDark: "#5c4018",
    },
    abyss: {
      skyTop: "#0c071b",
      floorMid: "#1b1038",
      floorEdge: "#05030d",
      stageGlow: "rgba(168, 85, 247, 0.28)",
      brazierCore: "#f0abfc",
      brazierGlow: "rgba(192, 72, 255, 0.36)",
      rimLightLeft: "rgba(192, 132, 252, 0.24)",
      rimLightRight: "rgba(56, 189, 248, 0.22)",
      runeStroke: "rgba(196, 145, 255, 0.25)",
      runeBright: "rgba(232, 180, 255, 0.5)",
      laneStroke: "rgba(196, 165, 255, 0.1)",
      centerLine: "rgba(216, 148, 255, 0.48)",
      particleGlow: "#e9d5ff",
      borderLight: "#e9c6ff",
      borderMid: "#8b5cf6",
      borderDark: "#3b1d70",
    },
    group: {
      skyTop: "#1a0a0a",
      floorMid: "#2c1311",
      floorEdge: "#0a0404",
      stageGlow: "rgba(249, 115, 22, 0.25)",
      brazierCore: "#fde047",
      brazierGlow: "rgba(255, 92, 24, 0.38)",
      rimLightLeft: "rgba(251, 146, 60, 0.24)",
      rimLightRight: "rgba(239, 68, 68, 0.22)",
      runeStroke: "rgba(251, 164, 96, 0.22)",
      runeBright: "rgba(253, 186, 116, 0.45)",
      laneStroke: "rgba(248, 185, 140, 0.09)",
      centerLine: "rgba(251, 146, 60, 0.45)",
      particleGlow: "#fdba74",
      borderLight: "#fed7aa",
      borderMid: "#c2612b",
      borderDark: "#5e250e",
    },
  };

export type ArenaBounds = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
};

export const getArenaPlayfieldBounds = (
  width: number,
  height: number,
  layout: ReplayLayout,
): ArenaBounds => {
  const isVertical = layout === "9:16";
  const left = isVertical ? 46 : 92;
  const right = width - left;
  const top = isVertical ? 148 : 82;
  const bottom = height - (isVertical ? 388 : 206);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

export const traceRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const traceChamferedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number,
): void => {
  const c = Math.min(cut, width * 0.25, height * 0.45);
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + width - c, y);
  ctx.lineTo(x + width, y + c);
  ctx.lineTo(x + width, y + height - c);
  ctx.lineTo(x + width - c, y + height);
  ctx.lineTo(x + c, y + height);
  ctx.lineTo(x, y + height - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
};

const paintCornerRivets = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number,
  color: string,
): void => {
  const r = Math.max(2.5, Math.min(4.5, cut * 0.34));
  const offset = cut * 0.62;

  const corners = [
    [x + offset, y + offset],
    [x + width - offset, y + offset],
    [x + offset, y + height - offset],
    [x + width - offset, y + height - offset],
  ];

  ctx.fillStyle = color;

  for (const [cx, cy] of corners) {
    if (cx === undefined || cy === undefined) continue;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }
};

export const drawOrnateRpgPanel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  borderLight = "#fce29d",
  borderMid = "#b8893c",
  borderDark = "#5c4018",
  cut = 12,
): void => {
  ctx.save();

  ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;

  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, "rgba(28, 25, 38, 0.94)");
  bgGrad.addColorStop(0.5, "rgba(16, 15, 24, 0.95)");
  bgGrad.addColorStop(1, "rgba(10, 10, 16, 0.97)");
  traceChamferedRect(ctx, x, y, width, height, cut);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.save();
  traceChamferedRect(ctx, x, y, width, height, cut);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x + width * 0.65, y + height);
  sheen.addColorStop(0, "rgba(255, 244, 214, 0.08)");
  sheen.addColorStop(0.35, "rgba(255, 244, 214, 0.02)");
  sheen.addColorStop(0.36, "rgba(0, 0, 0, 0)");
  sheen.addColorStop(1, "rgba(0, 0, 0, 0.14)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  traceChamferedRect(ctx, x - 1, y - 1, width + 2, height + 2, cut + 1);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#050508";
  ctx.stroke();

  const rimGrad = ctx.createLinearGradient(x, y, x, y + height);
  rimGrad.addColorStop(0, borderLight);
  rimGrad.addColorStop(0.45, borderMid);
  rimGrad.addColorStop(1, borderDark);
  traceChamferedRect(
    ctx,
    x + 1,
    y + 1,
    width - 2,
    height - 2,
    Math.max(4, cut - 1),
  );
  ctx.lineWidth = 2;
  ctx.strokeStyle = rimGrad;
  ctx.stroke();

  traceChamferedRect(
    ctx,
    x + 4.5,
    y + 4.5,
    width - 9,
    height - 9,
    Math.max(3, cut - 3),
  );
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 232, 180, 0.18)";
  ctx.stroke();

  const topSpec = ctx.createLinearGradient(x + cut, y, x + width - cut, y);
  topSpec.addColorStop(0, "rgba(255, 255, 255, 0)");
  topSpec.addColorStop(0.5, "rgba(255, 250, 230, 0.62)");
  topSpec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.moveTo(x + cut, y + 1.2);
  ctx.lineTo(x + width - cut, y + 1.2);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = topSpec;
  ctx.stroke();

  paintCornerRivets(ctx, x, y, width, height, cut, borderLight);

  ctx.restore();
};

const arenaBackdropCache = new Map<string, HTMLCanvasElement>();

const paintBackdropPerspectiveStage = (
  g: CanvasRenderingContext2D,
  width: number,
  bounds: ArenaBounds,
  palette: ArenaAtmospherePalette,
): void => {
  const cx = width * 0.5;
  const cy = (bounds.top + bounds.bottom) * 0.5;
  const rx = bounds.width * 0.48;
  const ry = bounds.height * 0.45;

  g.save();
  g.strokeStyle = "rgba(255, 255, 255, 0.03)";
  g.lineWidth = 1;
  const cols = 12;

  for (let i = 0; i <= cols; i += 1) {
    const frac = i / cols - 0.5;
    const topX = cx + frac * bounds.width * 0.78;
    const botX = cx + frac * bounds.width * 1.24;
    g.beginPath();
    g.moveTo(topX, bounds.top - 50);
    g.lineTo(botX, bounds.bottom + 90);
    g.stroke();
  }

  g.strokeStyle = palette.runeStroke;
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();

  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
  g.stroke();

  g.beginPath();
  g.ellipse(cx, cy, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
  g.stroke();

  const rowHeight = bounds.height / 6;

  for (let row = 1; row < 6; row += 1) {
    const laneY = Math.round(bounds.top + row * rowHeight) + 0.5;

    const lineGrad = g.createLinearGradient(
      bounds.left,
      laneY,
      bounds.right,
      laneY,
    );

    const tone = row === 3 ? palette.centerLine : palette.laneStroke;
    lineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    lineGrad.addColorStop(0.16, tone);
    lineGrad.addColorStop(0.84, tone);
    lineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    g.beginPath();
    g.moveTo(bounds.left, laneY);
    g.lineTo(bounds.right, laneY);
    g.lineWidth = row === 3 ? 2.4 : 1;
    g.strokeStyle = lineGrad;
    g.stroke();
  }

  g.restore();
};

const buildArenaBackdrop = (
  width: number,
  height: number,
  theme: ReplayArenaTheme,
  layout: ReplayLayout,
): HTMLCanvasElement | null => {
  const doc = globalThis.document;

  if (!doc) return null;

  const key = `${theme}:${layout}:${width}x${height}`;
  const cached = arenaBackdropCache.get(key);

  if (cached) return cached;

  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d");

  if (!g) return null;

  const palette = ARENA_PALETTES[theme];
  const bounds = getArenaPlayfieldBounds(width, height, layout);
  const cx = width * 0.5;
  const cy = (bounds.top + bounds.bottom) * 0.5;

  const baseGrad = g.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, palette.skyTop);
  baseGrad.addColorStop(0.5, palette.floorMid);
  baseGrad.addColorStop(1, palette.floorEdge);
  g.fillStyle = baseGrad;
  g.fillRect(0, 0, width, height);

  const stageSpotlight = g.createRadialGradient(
    cx,
    cy,
    24,
    cx,
    cy,
    Math.max(width, height) * 0.55,
  );

  stageSpotlight.addColorStop(0, palette.stageGlow);
  stageSpotlight.addColorStop(0.55, "rgba(255, 255, 255, 0.025)");
  stageSpotlight.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = stageSpotlight;
  g.fillRect(0, 0, width, height);

  const leftRim = g.createRadialGradient(
    0,
    cy * 0.72,
    10,
    0,
    cy * 0.72,
    width * 0.55,
  );

  leftRim.addColorStop(0, palette.rimLightLeft);
  leftRim.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = leftRim;
  g.fillRect(0, 0, width, height);

  const rightRim = g.createRadialGradient(
    width,
    cy * 1.12,
    10,
    width,
    cy * 1.12,
    width * 0.55,
  );

  rightRim.addColorStop(0, palette.rimLightRight);
  rightRim.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = rightRim;
  g.fillRect(0, 0, width, height);

  paintBackdropPerspectiveStage(g, width, bounds, palette);

  arenaBackdropCache.set(key, canvas);

  return canvas;
};

const paintAnimatedArenaAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ReplayLayout,
  palette: ArenaAtmospherePalette,
  timeMs: number,
  highlightIntensity: number,
): void => {
  const bounds = getArenaPlayfieldBounds(width, height, layout);
  const cx = width * 0.5;
  const cy = (bounds.top + bounds.bottom) * 0.5;
  const rx = bounds.width * 0.48;
  const ry = bounds.height * 0.45;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const rot = timeMs * 0.00022;
  ctx.strokeStyle = palette.runeBright;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 16; i += 1) {
    const a = rot + (i / 16) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * rx * 0.62;
    const y1 = cy + Math.sin(a) * ry * 0.62;
    const x2 = cx + Math.cos(a) * rx * 0.94;
    const y2 = cy + Math.sin(a) * ry * 0.94;
    ctx.globalAlpha = 0.24 + (i % 2) * 0.14 + highlightIntensity * 0.3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const flicker = 0.88 + Math.sin(timeMs * 0.011) * 0.12;
  const torchYFrac = layout === "9:16" ? [0.22, 0.5, 0.74] : [0.26, 0.68];

  for (const yf of torchYFrac) {
    for (const side of [0, 1]) {
      const bx = side === 0 ? bounds.left * 0.52 : width - bounds.left * 0.52;
      const by = height * yf;
      const rad = (layout === "9:16" ? 190 : 175) * flicker;
      const glow = ctx.createRadialGradient(bx, by, 4, bx, by, rad);
      glow.addColorStop(0, palette.brazierCore);
      glow.addColorStop(0.18, palette.brazierGlow);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = 0.52 + highlightIntensity * 0.25;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const beamPulse = 0.6 + Math.sin(timeMs * 0.0025) * 0.22;

  const beamGrad = ctx.createLinearGradient(
    width * 0.15,
    0,
    width * 0.68,
    height * 0.85,
  );

  beamGrad.addColorStop(0, "rgba(255, 240, 210, 0)");
  beamGrad.addColorStop(
    0.5,
    `rgba(255, 232, 185, ${0.045 * beamPulse + highlightIntensity * 0.04})`,
  );
  beamGrad.addColorStop(1, "rgba(255, 240, 210, 0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, 0);
  ctx.lineTo(width * 0.45, 0);
  ctx.lineTo(width * 0.82, height);
  ctx.lineTo(width * 0.34, height);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 28; i += 1) {
    const seed = (i + 1) * 7919;
    const xBase = ((seed * 29) % 1000) / 1000;
    const speed = 0.000028 + (seed % 5) * 0.000009;
    const yFrac = 1 - ((((timeMs * speed + (seed % 100) / 100) % 1) + 1) % 1);
    const px = xBase * width + Math.sin(timeMs * 0.002 + i) * 22;
    const py = yFrac * height;
    const rad = 2.4 + (i % 3) * 2.1;

    const mote = ctx.createRadialGradient(px, py, 0, px, py, rad * 3.2);
    mote.addColorStop(0, "#ffffff");
    mote.addColorStop(0.35, palette.particleGlow);
    mote.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = Math.sin(yFrac * Math.PI) * 0.72;
    ctx.fillStyle = mote;
    ctx.beginPath();
    ctx.arc(px, py, rad * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

export const paintArenaBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ReplayArenaTheme,
  layout: ReplayLayout,
  timeMs: number,
  highlightIntensity: number,
  reducedMotion: boolean,
): void => {
  const palette = ARENA_PALETTES[theme];
  const backdrop = buildArenaBackdrop(width, height, theme, layout);

  ctx.save();

  if (backdrop) {
    ctx.drawImage(backdrop, 0, 0, width, height);
  } else {
    ctx.fillStyle = palette.floorMid;
    ctx.fillRect(0, 0, width, height);
  }

  if (!reducedMotion) {
    paintAnimatedArenaAtmosphere(
      ctx,
      width,
      height,
      layout,
      palette,
      timeMs,
      highlightIntensity,
    );
  }

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    Math.min(width, height) * 0.25,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.74,
  );

  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(
    1,
    `rgba(4, 5, 10, ${0.58 + (reducedMotion ? 0 : highlightIntensity * 0.28)})`,
  );
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
};
