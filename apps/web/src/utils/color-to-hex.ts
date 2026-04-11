export const colorIntToHex = (color: number): string =>
  color === 0 ? "FFF" : color.toString(16).padStart(6, "0");
