import type { CSSProperties } from "react";

export type ChatDensityStyle = CSSProperties & {
  "--ll-chat-avatar-height": string;
  "--ll-chat-avatar-width": string;
  "--ll-chat-badge-font-size": string;
  "--ll-chat-character-size": string;
  "--ll-chat-control-height": string;
  "--ll-chat-detail-font-size": string;
  "--ll-chat-detail-line-height": string;
  "--ll-chat-font-size": string;
  "--ll-chat-icon-size": string;
  "--ll-chat-line-height": string;
  "--ll-chat-meta-font-size": string;
  "--ll-chat-meta-line-height": string;
  "--ll-chat-space-lg": string;
  "--ll-chat-space-md": string;
  "--ll-chat-space-sm": string;
  "--ll-chat-space-xs": string;
};

const formatScaledPixels = (pixels: number, scale: number) => {
  const scaledPixels = Math.round(pixels * scale * 100) / 100;
  return `${scaledPixels}px`;
};

export const getChatDensityStyle = (
  fontScalePercent: number,
): ChatDensityStyle => {
  const scale = fontScalePercent / 100;

  return {
    "--ll-chat-avatar-height": formatScaledPixels(28, scale),
    "--ll-chat-avatar-width": formatScaledPixels(24, scale),
    "--ll-chat-badge-font-size": formatScaledPixels(9, scale),
    "--ll-chat-character-size": formatScaledPixels(24, scale),
    "--ll-chat-control-height": formatScaledPixels(24, scale),
    "--ll-chat-detail-font-size": formatScaledPixels(10, scale),
    "--ll-chat-detail-line-height": formatScaledPixels(13, scale),
    "--ll-chat-font-size": formatScaledPixels(12, scale),
    "--ll-chat-icon-size": formatScaledPixels(12, scale),
    "--ll-chat-line-height": formatScaledPixels(16, scale),
    "--ll-chat-meta-font-size": formatScaledPixels(11, scale),
    "--ll-chat-meta-line-height": formatScaledPixels(14, scale),
    "--ll-chat-space-lg": formatScaledPixels(8, scale),
    "--ll-chat-space-md": formatScaledPixels(6, scale),
    "--ll-chat-space-sm": formatScaledPixels(4, scale),
    "--ll-chat-space-xs": formatScaledPixels(2, scale),
  };
};
