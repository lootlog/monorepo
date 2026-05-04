export const normalizePresenceLevel = (level: unknown) => {
  if (typeof level === "number" && Number.isFinite(level)) {
    return level;
  }

  const normalizedLevel =
    typeof level === "string" ? Number.parseInt(level, 10) : Number.NaN;

  return Number.isFinite(normalizedLevel) ? normalizedLevel : 0;
};
