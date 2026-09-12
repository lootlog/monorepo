export const stripAlphaChannel = (color: string): string => {
  const hex = color.replace("#", "");

  return hex.length === 8 ? `#${hex.slice(0, 6)}` : color;
};

export const alphaToHex = (alpha: number): string => {
  const value = Math.round((alpha / 100) * 255);

  return value.toString(16).padStart(2, "0");
};

export const hexToAlpha = (color: string): number => {
  const hex = color.replace("#", "");

  if (hex.length === 8) {
    const alphaHex = hex.slice(6, 8);
    const alphaValue = Number.parseInt(alphaHex, 16);

    return Math.round((alphaValue / 255) * 100);
  }

  return 20;
};

export interface ColorEditData {
  name: string;
  borderColor: string;
  backgroundColor: string;
  backgroundAlpha: number;
}
