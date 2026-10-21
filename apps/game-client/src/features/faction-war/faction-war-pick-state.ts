import type { FactionWarResponseDto } from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";

type PickableWar = Pick<FactionWarResponseDto, "id" | "status" | "pick">;

/**
 * Wars a one-off screen is done with on this browser, by war id: the pick
 * put away with "Nie teraz", or the result already seen.
 */
export type FactionWarFlags = Readonly<Record<string, boolean>>;

/** A faction can be picked only while the war runs and before the first pick. */
export const canPickFaction = (
  war: PickableWar | null | undefined,
): war is PickableWar => war?.status === "RUNNING" && war.pick === null;

/**
 * The pick screen opens by itself once per war: while the player can still
 * pick and has not put it away for this war. A later war asks again.
 */
export const shouldAutoOpenFactionWarPick = (
  war: PickableWar | null | undefined,
  dismissed: FactionWarFlags,
): boolean => canPickFaction(war) && !dismissed[war.id];

export const flagFactionWar = (flags: FactionWarFlags, warId: string) =>
  ({ ...flags, [warId]: true }) satisfies FactionWarFlags;

/** A faction's points, players and multiplier, when the server sent them. */
export const getFactionTotal = (
  war: Pick<FactionWarResponseDto, "totals">,
  faction: FactionWarFaction,
) => war.totals.find((total) => total.faction === faction);

/**
 * Today's underdog multiplier of a faction, when it has one: the faction
 * with fewer active players earns more per point.
 */
export const getFactionUnderdogBonus = (
  war: Pick<FactionWarResponseDto, "totals">,
  faction: FactionWarFaction,
): number | null => {
  const multiplier = getFactionTotal(war, faction)?.multiplier;

  return multiplier !== undefined && multiplier > 1 ? multiplier : null;
};
