import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

export const REPLAY_FONT_FAMILY = "Pixelify Sans";

type PixelTextStyle = {
  readonly size: number;
  readonly color: string;
  readonly weight?: 500 | 700;
  readonly align?: CanvasTextAlign;
  readonly baseline?: CanvasTextBaseline;
  readonly outline?: string | null;
  readonly outlineWidth?: number;
};

const setPixelFont = (
  ctx: CanvasRenderingContext2D,
  size: number,
  weight: 500 | 700 = 700,
) => {
  ctx.font = `${weight} ${size}px "${REPLAY_FONT_FAMILY}", "Trebuchet MS", sans-serif`;
};

export const measurePixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  weight: 500 | 700 = 700,
) => {
  setPixelFont(ctx, size, weight);

  return ctx.measureText(text).width;
};

export const drawPixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: PixelTextStyle,
) => {
  setPixelFont(ctx, style.size, style.weight);
  ctx.textAlign = style.align ?? "left";
  ctx.textBaseline = style.baseline ?? "alphabetic";

  const outline = style.outline === undefined ? "#0b0705" : style.outline;

  if (outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = style.outlineWidth ?? Math.max(1.5, style.size / 6);
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }

  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);
};

export const fitPixelText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: 500 | 700 = 700,
) => {
  if (measurePixelText(ctx, text, size, weight) <= maxWidth) return text;

  let fitted = text;

  while (
    fitted.length > 1 &&
    measurePixelText(ctx, `${fitted}…`, size, weight) > maxWidth
  ) {
    fitted = fitted.slice(0, -1);
  }

  return `${fitted.trimEnd()}…`;
};

const numberFormatter = new Intl.NumberFormat(PRODUCT_LOCALE);

export const formatReplayNumber = (value: number) =>
  numberFormatter.format(Math.round(value));
