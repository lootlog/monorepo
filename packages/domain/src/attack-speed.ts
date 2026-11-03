/**
 * Margonem's attack speed, from its combat mechanics at
 * https://pomoc.margonem.pl/index/view,372.
 */

/**
 * The attack speed agility gives:
 * `min(2, 0.02 * agility) + max(0, 0.002 * (agility - 100))`.
 */
export const attackSpeedFromAgility = (agility: number) =>
  Math.min(2, 0.02 * agility) + Math.max(0, 0.002 * (agility - 100));

// Past 100 agility, each further point adds this much attack speed.
const ATTACK_SPEED_PER_AGILITY_PAST_100 = 0.002;

/**
 * The attack speed an item adds to a character with at least 100 agility:
 * its own attack speed, which item stats hold in hundredths (`sa`), and its
 * agility (`dz`) and all attributes (`da`) at 0.002 a point. Below 100
 * agility each point is worth ten times more, but trackers pass 100 from
 * about level 45 and hunters from about level 25.
 */
export const itemAttackSpeed = (
  stats: Readonly<Partial<Record<string, number>>>,
) =>
  Math.round(
    ((stats.sa ?? 0) / 100 +
      ATTACK_SPEED_PER_AGILITY_PAST_100 * ((stats.dz ?? 0) + (stats.da ?? 0))) *
      10_000,
  ) / 10_000;
