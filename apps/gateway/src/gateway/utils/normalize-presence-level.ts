export const normalizePresenceLevel = (level: unknown): number => {
  if (typeof level === "number" && Number.isFinite(level)) {
    return level;
  }

  if (typeof level !== "string") {
    return 0;
  }

  const normalizedLevel = Number.parseInt(level, 10);
  return Number.isFinite(normalizedLevel) ? normalizedLevel : 0;
};
