export const formatDiscordColor = (
  color: number | null | undefined,
): string => {
  if (!color) return "FFF";
  return color.toString(16).padStart(6, "0");
};
