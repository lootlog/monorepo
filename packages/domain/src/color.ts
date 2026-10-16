import { clamp } from "es-toolkit";

export type RgbColor = readonly [number, number, number];

/** OKLCH lightness 0–1, chroma, and hue in degrees. */
export type OklchColor = readonly [number, number, number];

/** Reads `#RRGGBB` into 0–255 channels; the caller validates the format. */
export const hexToRgb = (color: string): RgbColor => [
  Number.parseInt(color.slice(1, 3), 16),
  Number.parseInt(color.slice(3, 5), 16),
  Number.parseInt(color.slice(5, 7), 16),
];

export const rgbToHex = (rgb: RgbColor) =>
  `#${rgb
    .map((channel) =>
      Math.round(clamp(channel, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;

const toLinearChannel = (channel: number) => {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const fromLinearChannel = (channel: number) =>
  255 *
  (channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055);

const relativeLuminance = (rgb: RgbColor) =>
  0.2126 * toLinearChannel(rgb[0]) +
  0.7152 * toLinearChannel(rgb[1]) +
  0.0722 * toLinearChannel(rgb[2]);

/** WCAG 2 contrast ratio between two colours. */
export const contrastRatio = (left: RgbColor, right: RgbColor) => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);

  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
};

// OKLab conversion by Björn Ottosson: https://bottosson.github.io/posts/oklab/
export const rgbToOklch = (rgb: RgbColor): OklchColor => {
  const r = toLinearChannel(rgb[0]);
  const g = toLinearChannel(rgb[1]);
  const b = toLinearChannel(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(bAxis, a) * 180) / Math.PI;

  return [lightness, Math.hypot(a, bAxis), hue < 0 ? hue + 360 : hue];
};

const oklchToLinearRgb = ([lightness, chroma, hue]: OklchColor) => {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ] as const;
};

const isInSrgbGamut = (linear: readonly number[]) =>
  linear.every((channel) => channel >= -0.0001 && channel <= 1.0001);

/**
 * Converts to sRGB, lowering chroma until the colour fits the gamut so its
 * lightness and hue survive.
 */
export const oklchToRgb = (color: OklchColor): RgbColor => {
  const [lightness, chroma, hue] = color;
  let low = 0;
  let high = chroma;
  let linear = oklchToLinearRgb([lightness, chroma, hue]);

  if (!isInSrgbGamut(linear)) {
    for (let step = 0; step < 20; step += 1) {
      const middle = (low + high) / 2;

      if (isInSrgbGamut(oklchToLinearRgb([lightness, middle, hue]))) {
        low = middle;
      } else {
        high = middle;
      }
    }

    linear = oklchToLinearRgb([lightness, low, hue]);
  }

  return [
    fromLinearChannel(clamp(linear[0], 0, 1)),
    fromLinearChannel(clamp(linear[1], 0, 1)),
    fromLinearChannel(clamp(linear[2], 0, 1)),
  ];
};

export const oklchToHex = (color: OklchColor) => rgbToHex(oklchToRgb(color));
