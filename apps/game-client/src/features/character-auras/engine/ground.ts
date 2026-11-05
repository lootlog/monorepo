import { clamp } from "es-toolkit";
import { hexToRgb } from "@lootlog/domain/color";
import { TAU, noise1, type Rgb } from "./math";
import { drawRunes, pixelEllipse, pixelLine, plot, softEllipse } from "./paint";
import { drawMagicCircle, type Brush } from "./decor";
import { groundRadius, type AuraPlacement } from "./placement";
import type { AuraPreset } from "./presets";

/**
 * The preset's ground piece under the feet; `beat` is the preset's pulse and `flash` the
 * lightning or burst flash.
 */
export function drawGround(
  b: Brush,
  place: AuraPlacement,
  ground: NonNullable<AuraPreset["ground"]>,
  beat: number,
  flash: number,
): void {
  const intensity = b.intensity;
  const color = hexToRgb(ground.color);
  const [light, , dark] = b.tones;
  const rx = groundRadius(place);
  const ry = Math.round(rx * 0.36);
  const x = Math.round(place.feetX);
  const y = Math.round(place.feetY) - 2;
  const pulse = beat + flash;
  const a = ground.alpha * intensity * clamp(pulse, 0.5, 1.6);
  const t = b.time;
  const lit = b.lit();

  switch (ground.style) {
    case "disc":
      softEllipse(lit, x, y, rx * 1.15, ry * 1.15, color, a * 0.8);
      pixelEllipse(lit, x, y, rx, ry, light, a * 0.5, 0, 1);
      break;
    case "ring":
      softEllipse(lit, x, y, rx, ry, color, a * 0.35);
      pixelEllipse(
        lit,
        x,
        y,
        rx + (Math.sin(t * 2) > 0 ? 1 : 0),
        ry,
        light,
        a,
        0,
        1,
      );
      pixelEllipse(
        lit,
        x,
        y,
        Math.round(rx * 0.62),
        Math.round(ry * 0.62),
        color,
        a * 0.6,
        0,
        1,
      );
      break;
    case "runes":
      softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.45);
      pixelEllipse(lit, x, y, rx, ry, light, a * 0.9, 0, 1);
      pixelEllipse(
        lit,
        x,
        y,
        Math.round(rx * 0.68),
        Math.round(ry * 0.68),
        color,
        a * 0.55,
        0,
        1,
      );
      drawRunes(lit, x, y, rx * 0.84, ry * 0.84, t * 0.35, light, a);
      break;
    case "vortex": {
      softEllipse(
        b.dim(),
        x,
        y,
        rx * 1.2,
        ry * 1.2,
        [10, 0, 18],
        0.75 * intensity,
      );

      drawVortexArms(lit, x, y, rx, ry, t, light, color, a);
      break;
    }

    case "frost":
      softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.45);
      pixelEllipse(lit, x, y, rx, ry, light, a * 0.6, 0, 2);
      break;
    case "rainbow":
      softEllipse(lit, x, y, rx * 0.95, ry * 0.95, [255, 255, 255], a * 0.2);
      pixelEllipse(lit, x, y, rx, ry, null, a, t * 1.2, 1);
      break;
    case "ripples":
      // Three rings spreading from the feet in turn, fading as they widen.
      softEllipse(lit, x, y, rx, ry, color, a * 0.3);

      for (let i = 0; i < 3; i++) {
        const phase = (t * 0.7 + i / 3) % 1;
        pixelEllipse(
          lit,
          x,
          y,
          Math.max(2, Math.round(rx * (0.3 + phase))),
          Math.max(1, Math.round(ry * (0.3 + phase))),
          phase < 0.5 ? light : color,
          a * (1 - phase),
          0,
          1,
        );
      }

      break;
    case "circle":
      softEllipse(lit, x, y, rx * 1.1, ry * 1.1, color, a * 0.35);
      drawMagicCircle(b, x, y, rx, ry, 1);
      break;
    case "dust":
      softEllipse(lit, x, y, rx * 1.1, ry * 1.1, dark, a * 0.45);

      // Dashes of sand racing round the feet.
      for (let dash = 0; dash < 4; dash++) {
        for (let s = 0; s < 8; s++) {
          const angle = t * 4 + (dash * TAU) / 4 + s * 0.08;
          plot(
            lit,
            x + Math.cos(angle) * rx * (0.85 + (dash % 2) * 0.2),
            y + Math.sin(angle) * ry,
            s < 3 ? light : color,
            (s / 8) * a,
          );
        }
      }

      break;
    case "cracks":
      drawCrackedGround(b, x, y, rx, ry, color, a, intensity, flash);
      break;
    case "mist":
      for (let i = 0; i < 5; i++) {
        const ox = noise1(t * 0.35 + i * 7.1, 11) * rx * 0.8;
        const oy = noise1(t * 0.3 + i * 3.7, 12) * ry * 0.5;
        softEllipse(
          lit,
          x + ox,
          y + oy,
          rx * 0.8,
          ry * 0.95,
          i % 2 ? color : dark,
          a * 0.55,
        );
      }

      break;
  }
}

/** Ground split by the pressure: jagged cracks from the feet, glowing red in pulses. */
function drawCrackedGround(
  b: Brush,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: Rgb,
  a: number,
  intensity: number,
  flash: number,
): void {
  const lit = b.lit();
  const dim = b.dim();
  const glowing = b.tick % 7 < 3 || flash > 0.3;

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * TAU + 0.4;
    let px = x;
    let py = y;

    for (let s = 1; s <= 5; s++) {
      const bend = noise1(i * 9.7 + s, 17) * 0.5;
      const nx = x + Math.cos(angle + bend) * rx * (s / 5) * 1.15;
      const ny = y + Math.sin(angle + bend) * ry * (s / 5) * 1.15;
      pixelLine(dim, px, py, nx, ny, [20, 4, 6], a, a * 0.7);

      if (glowing)
        pixelLine(
          lit,
          px,
          py - 1,
          nx,
          ny - 1,
          color,
          a * (1 - s / 6),
          a * (1 - s / 5),
        );
      px = nx;
      py = ny;
    }
  }

  softEllipse(b.dim(), x, y, rx * 0.6, ry * 0.6, [10, 0, 4], 0.6 * intensity);
}

/** Vortex ground: three arms of pixels winding in, rotating a notch per tick. */
function drawVortexArms(
  lit: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  t: number,
  light: Rgb,
  color: Rgb,
  a: number,
): void {
  for (let arm = 0; arm < 3; arm++) {
    const start = t * 1.6 + (arm * TAU) / 3;

    for (let s = 0; s < 16; s++) {
      const f = s / 16;
      const ang = start + f * 3.4;
      const r = 1.05 - f * 0.85;
      plot(
        lit,
        x + Math.cos(ang) * rx * r,
        y + Math.sin(ang) * ry * r,
        f > 0.6 ? light : color,
        a * (0.25 + f * 0.75),
      );
    }
  }
}
