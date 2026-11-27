import type {
  ReplayLayout,
  ReplayParticipant,
  ReplayTimeline,
  ReplayVictoryEvent,
} from "@lootlog/battle-processor/replay-timeline";
import { drawOrnateRpgPanel, traceChamferedRect } from "./replay-arena-painter";
import type { ReplayRenderLabels } from "./replay-canvas-types";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const formatDamageNumber = (value: number): string =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ");

const resolveVictoryStyle = (outcome: ReplayVictoryEvent["outcome"]) => {
  if (outcome === "victory") {
    return {
      titleTop: "#fffbe6",
      titleMid: "#fde047",
      titleBot: "#d97706",
      borderLight: "#fef08a",
      borderMid: "#eab308",
      borderDark: "#713f12",
      glowRgb: "250, 204, 21",
    };
  }

  if (outcome === "defeat") {
    return {
      titleTop: "#ffe4e6",
      titleMid: "#fb7185",
      titleBot: "#be123c",
      borderLight: "#fda4af",
      borderMid: "#e11d48",
      borderDark: "#4c0519",
      glowRgb: "244, 63, 94",
    };
  }

  return {
    titleTop: "#f8fafc",
    titleMid: "#cbd5e1",
    titleBot: "#64748b",
    borderLight: "#e2e8f0",
    borderMid: "#94a3b8",
    borderDark: "#334155",
    glowRgb: "148, 163, 184",
  };
};

const paintVictorySunburstAndSparks = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  glowRgb: string,
  borderLight: string,
): void => {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.72;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const rays = 14;
  const baseRot = progress * 0.85;

  for (let i = 0; i < rays; i += 1) {
    const a1 = baseRot + (i / rays) * Math.PI * 2;
    const a2 = a1 + (Math.PI / rays) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxR);
    grad.addColorStop(0, `rgba(${glowRgb}, 0.24)`);
    grad.addColorStop(0.5, `rgba(${glowRgb}, 0.08)`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a1) * maxR, cy + Math.sin(a1) * maxR);
    ctx.lineTo(cx + Math.cos(a2) * maxR, cy + Math.sin(a2) * maxR);
    ctx.closePath();
    ctx.fill();
  }

  if (progress < 0.35) {
    const ringP = progress / 0.35;
    const r = Math.min(width, height) * (0.12 + ringP * 0.56);
    ctx.strokeStyle = borderLight;
    ctx.globalAlpha = (1 - ringP) * 0.85;
    ctx.lineWidth = Math.max(2, 10 * (1 - ringP));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 36; i += 1) {
    const angle = ((i * 137.5) % 360) * (Math.PI / 180);
    const speed = 0.35 + ((i * 31) % 100) / 100;
    const dist = Math.min(width, height) * 0.58 * speed * progress;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist - progress * 48;
    const size = 2.5 + (i % 3) * 2;
    ctx.globalAlpha = Math.max(0, 1 - progress * 0.85);
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : borderLight;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const paintVictoryCrestEmblem = (
  ctx: CanvasRenderingContext2D,
  y: number,
  scale: number,
  borderLight: string,
  borderMid: string,
): void => {
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * -34, 18);
    ctx.lineTo(dir * 34, -22);
    ctx.stroke();
    ctx.strokeStyle = borderMid;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(dir * -26, 22);
    ctx.lineTo(dir * -14, 8);
    ctx.stroke();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;
  }

  const shieldGrad = ctx.createLinearGradient(0, -28, 0, 26);
  shieldGrad.addColorStop(0, borderLight);
  shieldGrad.addColorStop(0.5, borderMid);
  shieldGrad.addColorStop(1, "#422006");
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(22, -16);
  ctx.lineTo(18, 10);
  ctx.lineTo(0, 26);
  ctx.lineTo(-18, 10);
  ctx.lineTo(-22, -16);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(8, -2);
  ctx.lineTo(0, 11);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

export const paintVictoryOverlay = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: ReplayLayout,
  timeline: ReplayTimeline,
  victory: ReplayVictoryEvent,
  progress: number,
  labels: ReplayRenderLabels,
): void => {
  const isVertical = layout === "9:16";
  const fadeIn = clamp01(progress / 0.22);
  const pop = 0.86 + 0.14 * (1 - (1 - fadeIn) ** 3);
  const style = resolveVictoryStyle(victory.outcome);

  const mvp: ReplayParticipant | undefined = timeline.participants.find(
    (participant) => participant.id === victory.mvpId,
  );

  ctx.save();
  ctx.fillStyle = `rgba(5, 6, 12, ${0.8 * fadeIn})`;
  ctx.fillRect(0, 0, width, height);

  paintVictorySunburstAndSparks(
    ctx,
    width,
    height,
    progress,
    style.glowRgb,
    style.borderLight,
  );

  ctx.translate(width / 2, height / 2);
  ctx.scale(pop, pop);
  ctx.globalAlpha = fadeIn;

  const cardW = isVertical ? width * 0.86 : 660;
  const cardH = isVertical ? 510 : 344;

  drawOrnateRpgPanel(
    ctx,
    -cardW / 2,
    -cardH / 2,
    cardW,
    cardH,
    style.borderLight,
    style.borderMid,
    style.borderDark,
    22,
  );

  paintVictoryCrestEmblem(
    ctx,
    -cardH / 2,
    isVertical ? 1.45 : 1.12,
    style.borderLight,
    style.borderMid,
  );

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleY = -cardH / 2 + (isVertical ? 112 : 82);
  const titleSize = isVertical ? 68 : 54;
  ctx.font = `900 ${titleSize}px Georgia, "Palatino Linotype", serif`;

  const titleGrad = ctx.createLinearGradient(
    0,
    titleY - titleSize * 0.55,
    0,
    titleY + titleSize * 0.45,
  );

  titleGrad.addColorStop(0, style.titleTop);
  titleGrad.addColorStop(0.52, style.titleMid);
  titleGrad.addColorStop(1, style.titleBot);

  ctx.shadowColor = `rgba(${style.glowRgb}, 0.78)`;
  ctx.shadowBlur = 26;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#08070d";
  ctx.strokeText(labels.outcomes[victory.outcome].toUpperCase(), 0, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(labels.outcomes[victory.outcome].toUpperCase(), 0, titleY);
  ctx.shadowBlur = 0;

  const lineY = titleY + (isVertical ? 50 : 36);
  const ruleGrad = ctx.createLinearGradient(-cardW * 0.36, 0, cardW * 0.36, 0);
  ruleGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  ruleGrad.addColorStop(0.5, style.borderLight);
  ruleGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.strokeStyle = ruleGrad;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-cardW * 0.36, lineY);
  ctx.lineTo(cardW * 0.36, lineY);
  ctx.stroke();

  if (victory.winnerName) {
    ctx.font = `800 ${isVertical ? 36 : 25}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(victory.winnerName, 0, lineY + (isVertical ? 46 : 32));
  }

  const statW = cardW - (isVertical ? 88 : 96);
  const statH = isVertical ? 128 : 82;
  const statY = isVertical ? 14 : 10;
  traceChamferedRect(ctx, -statW / 2, statY, statW, statH, 10);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fill();
  ctx.strokeStyle = `rgba(${style.glowRgb}, 0.34)`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = `700 ${isVertical ? 24 : 16}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(
    `${labels.totalTurns}: ${victory.totalTurns}`,
    0,
    statY + (isVertical ? 36 : 25),
  );

  if (mvp) {
    const mvpText = `★  ${labels.mvp}: ${mvp.name} (${formatDamageNumber(victory.mvpDamage)} ${labels.damageShort})`;
    ctx.font = `800 ${isVertical ? 28 : 19}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.fillStyle = "#fde047";
    ctx.fillText(mvpText, 0, statY + (isVertical ? 86 : 56));
  }

  ctx.font = `900 ${isVertical ? 24 : 16}px Georgia, "Palatino Linotype", serif`;
  ctx.fillStyle = style.borderLight;
  ctx.fillText(labels.watermark, 0, cardH / 2 - (isVertical ? 42 : 30));

  ctx.restore();
};
