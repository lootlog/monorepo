import type { FactionWarAwardDto } from "@lootlog/client/main";

/** Awards this close to the previous one join its toast. */
export const FACTION_WAR_POINTS_BURST_MS = 1_500;

/** Points shown in one toast: a kill and its loot, or a quick string of kills. */
export type FactionWarPointsBurst = Readonly<{
  /** Names the toast, so later awards of the burst update it in place. */
  id: number;
  faction: FactionWarAwardDto["faction"];
  points: number;
  lastAwardAt: number;
}>;

/**
 * The burst after one kill or loot response. An award joins the current
 * burst when it comes within the burst window of the previous award and
 * counts for the same faction; otherwise it starts a new one. Returns null
 * when the response earned nothing to show: no award, or 0 points at the
 * daily cap.
 */
export const addFactionWarPoints = (
  burst: FactionWarPointsBurst | null,
  award: FactionWarAwardDto | undefined,
  now: number,
): FactionWarPointsBurst | null => {
  if (!award || award.points <= 0) return null;

  if (
    burst &&
    burst.faction === award.faction &&
    now - burst.lastAwardAt <= FACTION_WAR_POINTS_BURST_MS
  ) {
    return { ...burst, points: burst.points + award.points, lastAwardAt: now };
  }

  return {
    id: (burst?.id ?? 0) + 1,
    faction: award.faction,
    points: award.points,
    lastAwardAt: now,
  };
};
