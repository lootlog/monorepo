export type MemberStatsSummary = {
  totalKills: number;
  totalPoints: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  avgPointsPerKill: number;
  avgTimePerKillSeconds: number;
};

export type MemberIdentity = {
  avatar?: string | null;
  name: string;
  userId: string;
};

export const formatPoints = (value: number) => {
  const rounded = Math.round(value * 100) / 100;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const formatPercentage = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");

  return `${normalized}%`;
};
