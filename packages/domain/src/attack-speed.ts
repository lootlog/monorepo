export const attackSpeedFromAgility = (agility: number) =>
  Math.min(2, 0.02 * agility) + Math.max(0, 0.002 * (agility - 100));

const ATTACK_SPEED_PER_AGILITY_PAST_100 = 0.002;

export const itemAttackSpeed = (
  stats: Readonly<Partial<Record<string, number>>>,
) =>
  Math.round(
    ((stats.sa ?? 0) / 100 +
      ATTACK_SPEED_PER_AGILITY_PAST_100 * ((stats.dz ?? 0) + (stats.da ?? 0))) *
      10_000,
  ) / 10_000;
