import type { MargonemCharacter } from "@/api/characters.api";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getFixedT } from "@/i18n/get-fixed-t";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";

export type OnlinePlayerAccountEntry = {
  discordId: string;
  presence: PlayerPresence;
};

export type GuildMembersByUserId = Record<
  string,
  MemberSummaryResponseDtoOutput
>;

export const MIN_ONLINE_PLAYER_LEVEL = 0;
export const MAX_ONLINE_PLAYER_LEVEL = 500;
export const ALL_PROFESSIONS_VALUE = "all";
export const PROFESSION_OPTIONS = ["p", "w", "h", "m", "b", "t"] as const;

export type ProfessionFilterValue =
  | typeof ALL_PROFESSIONS_VALUE
  | (typeof PROFESSION_OPTIONS)[number];

export type OnlinePlayersFiltersValue = {
  minLvl: number;
  maxLvl: number;
  selectedProfession: ProfessionFilterValue;
};

export const DEFAULT_ONLINE_PLAYERS_FILTERS: OnlinePlayersFiltersValue = {
  minLvl: MIN_ONLINE_PLAYER_LEVEL,
  maxLvl: MAX_ONLINE_PLAYER_LEVEL,
  selectedProfession: ALL_PROFESSIONS_VALUE,
};

export const clampOnlinePlayerLevel = (level: number) => {
  return Math.max(
    MIN_ONLINE_PLAYER_LEVEL,
    Math.min(MAX_ONLINE_PLAYER_LEVEL, level),
  );
};

export const getPresenceCharacter = (
  presence: PlayerPresence,
): MargonemCharacter => {
  const t = getFixedT("common");

  return {
    id: presence.player?.characterId
      ? Number.parseInt(presence.player.characterId, 10)
      : 0,
    nick: presence.player?.name ?? t("states.unknownNeutral"),
    icon: presence.player?.icon ?? "",
    lvl: presence.player?.lvl ?? 0,
    prof: presence.player?.prof ?? t("states.unknownNeutral"),
    world: presence.player?.world ?? t("states.unknownNeutral"),
  };
};

const getPresenceSortKey = (presence: PlayerPresence) => {
  return `${presence.player?.accountId ?? ""}-${presence.player?.characterId ?? ""}`;
};

export const comparePlayerPresencesByLevel = (
  firstPresence: PlayerPresence,
  secondPresence: PlayerPresence,
) => {
  const firstPlayer = firstPresence.player;
  const secondPlayer = secondPresence.player;

  if (!firstPlayer && !secondPlayer) {
    return getPresenceSortKey(firstPresence).localeCompare(
      getPresenceSortKey(secondPresence),
    );
  }

  if (!firstPlayer) return 1;
  if (!secondPlayer) return -1;

  const levelDiff = secondPlayer.lvl - firstPlayer.lvl;

  if (levelDiff !== 0) return levelDiff;

  const nameDiff = firstPlayer.name.localeCompare(secondPlayer.name);

  if (nameDiff !== 0) return nameDiff;

  return getPresenceSortKey(firstPresence).localeCompare(
    getPresenceSortKey(secondPresence),
  );
};

const matchesPresenceFilters = (
  presence: PlayerPresence,
  filters: OnlinePlayersFiltersValue,
) => {
  const player = presence.player;

  if (!player) return false;

  const matchesLevel =
    player.lvl >= filters.minLvl && player.lvl <= filters.maxLvl;
  const matchesProfession =
    filters.selectedProfession === ALL_PROFESSIONS_VALUE ||
    player.prof === filters.selectedProfession;

  return matchesLevel && matchesProfession;
};

export const getFilteredMemberEntries = (
  onlinePlayers: Record<string, PlayerPresence[]>,
  guildMembers: GuildMembersByUserId | undefined,
  searchQuery: string,
  filters: OnlinePlayersFiltersValue,
) => {
  const query = searchQuery.toLowerCase();
  const entries: Array<readonly [string, PlayerPresence[]]> = [];

  for (const [discordId, presences] of Object.entries(onlinePlayers)) {
    const filteredPresences: PlayerPresence[] = [];
    let hasMatchingCharacter = false;

    for (const presence of presences) {
      if (!matchesPresenceFilters(presence, filters)) {
        continue;
      }

      filteredPresences.push(presence);

      if (
        query &&
        !hasMatchingCharacter &&
        presence.player?.name?.toLowerCase().includes(query)
      ) {
        hasMatchingCharacter = true;
      }
    }

    if (filteredPresences.length === 0) {
      continue;
    }

    if (query) {
      const memberName = guildMembers?.[discordId]?.name?.toLowerCase() ?? "";
      if (!memberName.includes(query) && !hasMatchingCharacter) {
        continue;
      }
    }

    filteredPresences.sort(comparePlayerPresencesByLevel);
    entries.push([discordId, filteredPresences]);
  }

  return entries.sort(
    ([firstDiscordId, firstPresences], [secondDiscordId, secondPresences]) => {
      const firstTopLevel = firstPresences[0]?.player?.lvl ?? 0;
      const secondTopLevel = secondPresences[0]?.player?.lvl ?? 0;
      const levelDiff = secondTopLevel - firstTopLevel;

      if (levelDiff !== 0) return levelDiff;

      const firstMemberName =
        guildMembers?.[firstDiscordId]?.name ?? firstDiscordId;
      const secondMemberName =
        guildMembers?.[secondDiscordId]?.name ?? secondDiscordId;

      return firstMemberName.localeCompare(secondMemberName);
    },
  );
};

export const getFilteredAccountEntries = (
  onlinePlayers: Record<string, PlayerPresence[]>,
  guildMembers: GuildMembersByUserId | undefined,
  searchQuery: string,
  filters: OnlinePlayersFiltersValue,
): OnlinePlayerAccountEntry[] => {
  const entries: OnlinePlayerAccountEntry[] = [];
  const query = searchQuery.toLowerCase();

  for (const [discordId, presences] of Object.entries(onlinePlayers)) {
    const memberName = query
      ? (guildMembers?.[discordId]?.name?.toLowerCase() ?? "")
      : "";

    for (const presence of presences) {
      if (!presence.player || !matchesPresenceFilters(presence, filters)) {
        continue;
      }

      if (query) {
        const playerName = presence.player.name.toLowerCase();
        const locationName = (
          presence.player.location?.map ??
          presence.mapName ??
          ""
        ).toLowerCase();

        if (
          !memberName.includes(query) &&
          !playerName.includes(query) &&
          !locationName.includes(query)
        ) {
          continue;
        }
      }

      entries.push({ discordId, presence });
    }
  }

  return entries.sort((firstEntry, secondEntry) =>
    comparePlayerPresencesByLevel(firstEntry.presence, secondEntry.presence),
  );
};
