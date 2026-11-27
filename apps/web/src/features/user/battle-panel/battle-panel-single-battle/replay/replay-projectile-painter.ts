import type {
  ReplayAttackEvent,
  ReplayDamageKind,
} from "@lootlog/battle-processor/replay-timeline";
import type { ReplayAnchor } from "./replay-canvas-types";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const paintStarFlare = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void => {
  if (alpha <= 0.02) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha);

  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.32, color);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";

  for (const rot of [0, Math.PI / 2]) {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-radius * 1.15, 0);
    ctx.quadraticCurveTo(0, -radius * 0.14, radius * 1.15, 0);
    ctx.quadraticCurveTo(0, radius * 0.14, -radius * 1.15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
};

export const paintCrescentSlash = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  isCrit: boolean,
  isVeryCrit: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha =
    progress < 0.24 ? progress / 0.24 : 1 - (progress - 0.24) / 0.76;

  const radius = isVeryCrit ? 78 : isCrit ? 64 : 48;
  const thickness = isVeryCrit ? 22 : isCrit ? 16 : 11;
  const slashColor = isVeryCrit ? "#ff3d68" : isCrit ? "#fbbf24" : "#bae6fd";

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha);

  const drawCrescent = (rotation: number) => {
    ctx.save();
    ctx.rotate(rotation);
    const startA = -Math.PI * 0.66;
    const endA = Math.PI * 0.36;
    const steps = 16;

    ctx.beginPath();

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const a = startA + (endA - startA) * t;
      const r = radius + Math.sin(t * Math.PI) * thickness * 0.58;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    for (let i = steps; i >= 0; i -= 1) {
      const t = i / steps;
      const a = startA + (endA - startA) * t;
      const r = radius - Math.sin(t * Math.PI) * thickness * 0.42;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }

    ctx.closePath();
    ctx.shadowColor = slashColor;
    ctx.shadowBlur = isCrit ? 26 : 14;
    ctx.fillStyle = slashColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius, startA + 0.14, endA - 0.14);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isCrit ? 4 : 2.2;
    ctx.stroke();

    ctx.restore();
  };

  drawCrescent(-0.45 + progress * 0.75);

  if (isCrit) {
    drawCrescent(Math.PI - 0.45 - progress * 0.75);
  }

  ctx.restore();
};

export const paintFrostSpikeBurst = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  isCrit: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha = 1 - progress;
  const ease = 1 - (1 - progress) ** 3;
  const spikes = isCrit ? 8 : 6;
  const maxLen = (isCrit ? 88 : 64) * ease;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha) * 0.92;

  for (let i = 0; i < spikes; i += 1) {
    const angle = (i / spikes) * Math.PI * 2 + 0.3;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = i % 2 === 0 ? "#7dd3fc" : "#e0f2fe";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(maxLen * 0.42, -6);
    ctx.lineTo(maxLen, 0);
    ctx.lineTo(maxLen * 0.42, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
};

export const paintFireExplosion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  isCrit: boolean,
): void => {
  if (progress <= 0 || progress >= 1) return;

  const alpha = 1 - progress;
  const rad = (isCrit ? 115 : 82) * (0.35 + (1 - (1 - progress) ** 2) * 0.75);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha) * 0.9;

  const blast = ctx.createRadialGradient(x, y, 4, x, y, rad);
  blast.addColorStop(0, "#ffffff");
  blast.addColorStop(0.25, "#fef08a");
  blast.addColorStop(0.55, "#ff6b35");
  blast.addColorStop(0.85, "rgba(220, 38, 38, 0.45)");
  blast.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = blast;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const paintForkedLightning = (
  ctx: CanvasRenderingContext2D,
  to: ReplayAnchor,
  seed: number,
  progress: number,
  isCrit: boolean,
): void => {
  if (progress < 0.16 || progress > 0.9) return;

  const boltProgress = clamp01((progress - 0.16) / 0.74);
  const alpha = boltProgress < 0.2 ? 1 : 1 - (boltProgress - 0.2) / 0.8;
  const topY = Math.max(12, to.y - 340);
  const segments = 10;
  const points: { x: number; y: number }[] = [{ x: to.x, y: topY }];

  for (let s = 1; s < segments; s += 1) {
    const frac = s / segments;
    const jitter = (((seed + s * 613) % 62) - 31) * (1 - frac * 0.28);
    points.push({ x: to.x + jitter, y: topY + (to.y - topY) * frac });
  }

  points.push({ x: to.x, y: to.y + 12 });

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(alpha);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const strokeTrunk = (lineWidth: number, color: string) => {
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 28;
  strokeTrunk(isCrit ? 14 : 8, "#3b82f6");
  strokeTrunk(isCrit ? 7 : 4.5, "#fef08a");
  strokeTrunk(isCrit ? 3.2 : 2.2, "#ffffff");

  for (const idx of [2, 4, 6]) {
    const origin = points[idx];

    if (!origin) continue;

    const dir = idx % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + dir * 28, origin.y + 32);
    ctx.lineTo(origin.x + dir * 50, origin.y + 74);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#e0f2fe";
    ctx.stroke();
  }

  const halo = ctx.createRadialGradient(
    to.x,
    to.y + 16,
    6,
    to.x,
    to.y + 16,
    isCrit ? 96 : 74,
  );

  halo.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  halo.addColorStop(0.38, "rgba(254, 240, 138, 0.6)");
  halo.addColorStop(0.7, "rgba(56, 189, 248, 0.35)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(to.x, to.y + 16, isCrit ? 96 : 74, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const paintSleekArrow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  isCrit: boolean,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const trailGrad = ctx.createLinearGradient(-110, 0, 16, 0);
  trailGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  trailGrad.addColorStop(
    1,
    isCrit ? "rgba(253, 224, 71, 0.95)" : "rgba(134, 239, 172, 0.85)",
  );
  ctx.strokeStyle = trailGrad;
  ctx.lineWidth = isCrit ? 8 : 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-110, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.strokeStyle = isCrit
    ? "rgba(254, 240, 138, 0.75)"
    : "rgba(187, 247, 208, 0.6)";
  ctx.lineWidth = 2;

  for (const offset of [-14, -36]) {
    ctx.beginPath();
    ctx.ellipse(offset, 0, 4, isCrit ? 14 : 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  ctx.strokeStyle = isCrit ? "#fde047" : "#f1f5f9";
  ctx.lineWidth = isCrit ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(14, 0);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(10, -5.5);
  ctx.lineTo(13, 0);
  ctx.lineTo(10, 5.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

const paintSpellOrb = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  damageKind: ReplayDamageKind,
  isCrit: boolean,
): void => {
  const isFrost = damageKind === "frost";
  const outerColor = isFrost ? "#38bdf8" : "#ff6b35";
  const coreColor = isFrost ? "#e0f2fe" : "#fef08a";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "lighter";

  const tailGrad = ctx.createLinearGradient(-96, 0, 10, 0);
  tailGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  tailGrad.addColorStop(0.55, outerColor);
  tailGrad.addColorStop(1, coreColor);
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.quadraticCurveTo(-28, -16, -96, 0);
  ctx.quadraticCurveTo(-28, 16, 14, 0);
  ctx.closePath();
  ctx.fill();

  const orbRad = isCrit ? 26 : 19;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, orbRad * 1.7);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.32, coreColor);
  glow.addColorStop(0.68, outerColor);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, orbRad * 1.7, 0, Math.PI * 2);
  ctx.fill();

  if (isFrost) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(0, -9);
    ctx.lineTo(-18, 0);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
};

export const paintProjectile = (
  ctx: CanvasRenderingContext2D,
  attack: ReplayAttackEvent,
  from: ReplayAnchor,
  to: ReplayAnchor,
  progress: number,
  seed: number,
): void => {
  if (attack.damageKind === "lightning") {
    paintForkedLightning(ctx, to, seed, progress, attack.isCrit);

    return;
  }

  const flightProgress = clamp01(progress / 0.52);

  if (flightProgress <= 0 || flightProgress >= 1) return;

  const dy = to.y - from.y;
  const perpX = -dy * 0.12;
  const midX = (from.x + to.x) / 2 + perpX;
  const midY = (from.y + to.y) / 2 - 28;
  const inv = 1 - flightProgress;

  const x =
    inv * inv * from.x +
    2 * inv * flightProgress * midX +
    flightProgress * flightProgress * to.x;

  const y =
    inv * inv * from.y +
    2 * inv * flightProgress * midY +
    flightProgress * flightProgress * to.y;

  const txDeriv =
    2 * inv * (midX - from.x) + 2 * flightProgress * (to.x - midX);

  const tyDeriv =
    2 * inv * (midY - from.y) + 2 * flightProgress * (to.y - midY);

  const angle = Math.atan2(tyDeriv, txDeriv);

  if (attack.damageKind === "distance") {
    paintSleekArrow(ctx, x, y, angle, attack.isCrit);

    return;
  }

  paintSpellOrb(ctx, x, y, angle, attack.damageKind, attack.isCrit);
};

export const paintDefenseVfx = (
  ctx: CanvasRenderingContext2D,
  event: ReplayAttackEvent,
  target: ReplayAnchor,
  impactProgress: number,
): void => {
  const alpha = 1 - impactProgress;

  if (event.isEvade) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    for (const dy of [-18, 0, 18]) {
      ctx.beginPath();
      ctx.moveTo(target.x - 42, target.y + dy);
      ctx.quadraticCurveTo(
        target.x,
        target.y + dy - 10,
        target.x + 36,
        target.y + dy,
      );
      ctx.stroke();
    }

    ctx.restore();

    return;
  }

  if (event.isParry) {
    paintStarFlare(ctx, target.x, target.y - 8, 66, "#e0f2fe", alpha);

    return;
  }

  if (event.isBlock || event.isArrowBlock) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * 0.85;
    const rad = 44 + impactProgress * 22;
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(target.x, target.y - 4, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};
