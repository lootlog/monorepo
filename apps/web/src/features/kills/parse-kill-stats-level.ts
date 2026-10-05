export const parseKillStatsLevel = (value: string) => {
  const level = Number.parseInt(value, 10);

  return Number.isNaN(level) ? undefined : level;
};
