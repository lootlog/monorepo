import type { FactionWarChampionsResponseDto } from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";

/** The winning faction of each champion, by Margonem character id. */
export type ChampionFactions = ReadonlyMap<string, FactionWarFaction>;

export type VisibleChampion = {
  characterId: string;
  faction: FactionWarFaction;
};

const NO_CHAMPIONS: ChampionFactions = new Map();

export const indexChampionFactions = (
  response: FactionWarChampionsResponseDto | undefined,
): ChampionFactions => {
  if (!response?.warId || response.champions.length === 0) return NO_CHAMPIONS;

  const factions = new Map<string, FactionWarFaction>();

  for (const group of response.champions) {
    for (const characterId of group.characterIds) {
      // A User picks one faction, so a character sits in one group; should
      // the server ever list it twice, the first group keeps it.
      if (!factions.has(characterId)) factions.set(characterId, group.faction);
    }
  }

  return factions;
};

/**
 * The champions standing on the current map: other players, unless the
 * player hid other champions on their own screen, and the hero, whose own
 * highlight the server already left out when its owner turned it off.
 */
export const selectVisibleChampions = ({
  factions,
  heroId,
  otherIds,
  hideOthers,
}: {
  factions: ChampionFactions;
  heroId: string | undefined;
  otherIds: Iterable<string>;
  hideOthers: boolean;
}): VisibleChampion[] => {
  if (factions.size === 0) return [];

  const visible: VisibleChampion[] = [];
  const heroFaction = heroId ? factions.get(heroId) : undefined;

  if (heroId && heroFaction) {
    visible.push({ characterId: heroId, faction: heroFaction });
  }

  if (hideOthers) return visible;

  for (const characterId of otherIds) {
    const faction = factions.get(characterId);

    if (faction && characterId !== heroId) {
      visible.push({ characterId, faction });
    }
  }

  return visible;
};
