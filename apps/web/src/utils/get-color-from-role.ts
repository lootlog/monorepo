export const roleColorToHex = (color: number): string =>
  color === 0 ? "FFF" : color.toString(16).padStart(6, "0");

export const getColorFromRole = (roles: { color: number }[]) => {
  const color = roles[0]?.color;
  return color === undefined ? undefined : roleColorToHex(color);
};
