import {
  factionWarShares,
  type FactionWarFaction,
} from "@lootlog/domain/faction-war";
import { API_URL } from "@/src/config/api";

export type PublicFactionWarFaction = FactionWarFaction;

/** The public summary of the current war: no player data. */
export type PublicFactionWar = {
  id: string;
  status: "UPCOMING" | "RUNNING" | "ENDED";
  startsAt: string;
  endsAt: string;
  totals: {
    faction: PublicFactionWarFaction;
    /** The war score, after the daily underdog multipliers. */
    points: number;
    players: number;
    multiplier: number;
  }[];
  winners: PublicFactionWarFaction[];
};

/** Left to right, as the art faces: fire on the left, ice on the right. */
export const PUBLIC_FACTION_WAR_SIDES = ["BARBATOS", "TANROTH"] as const;

/** The current war, or `null` when none is defined or the API cannot be reached. */
export async function fetchPublicFactionWar(
  signal: AbortSignal,
): Promise<PublicFactionWar | null> {
  const response = await fetch(`${API_URL}/public/faction-wars/current`, {
    signal,
  });

  if (!response.ok) return null;

  const war: PublicFactionWar = await response.json();

  return war;
}

/** Both factions in side order, with their share of the score; even before anyone scores. */
export function getPublicFactionWarSides(war: PublicFactionWar) {
  const shares = factionWarShares(war.totals);

  return PUBLIC_FACTION_WAR_SIDES.map((faction) => ({
    ...(war.totals.find((total) => total.faction === faction) ?? {
      faction,
      points: 0,
      players: 0,
      multiplier: 1,
    }),
    share: shares[faction],
  }));
}

const emblems = import.meta.glob<string>(
  "../assets/faction-wars/*/*-emblem.webp",
  { eager: true, import: "default", query: "?url" },
);

/** A war's crest for a faction, bundled per war id; `undefined` for a war without art. */
export const getPublicFactionWarEmblem = (
  warId: string,
  faction: PublicFactionWarFaction,
) =>
  emblems[
    `../assets/faction-wars/${warId}/${faction.toLowerCase()}-emblem.webp`
  ];
