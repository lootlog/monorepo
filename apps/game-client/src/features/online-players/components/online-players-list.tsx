import { GuildSwitcher } from "@/components/guild-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorldSelector } from "@/components/world-selector";
import { OnlinePlayersAccountListEntry } from "@/features/online-players/components/online-players-account-list-entry";
import { OnlinePlayersFilters } from "@/features/online-players/components/online-players-filters";
import { OnlinePlayersListEntry } from "@/features/online-players/components/online-players-list-entry";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import { useState, type ChangeEvent, type FC, type ReactNode } from "react";
import { Game } from "@/lib/game";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_ONLINE_PLAYERS_FILTERS,
  clampOnlinePlayerLevel,
  getFilteredAccountEntries,
  getFilteredMemberEntries,
  type ProfessionFilterValue,
} from "@/features/online-players/online-players-list.helpers";

type OnlinePlayersListProps = {
  viewMode: OnlinePlayersViewMode;
  filtersVisible: boolean;
};

export const OnlinePlayersList: FC<OnlinePlayersListProps> = ({
  viewMode,
  filtersVisible,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const characterId = String(Game.hero.id);
  const defaultWorld = Game.getWorldName();

  const { allowWorldSelection, guildIdByCharId, worldByGuildId } =
    useSettingsStore();
  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const [onlinePlayers] = usePlayersPresence(guildId, world || defaultWorld);
  const filtersByGuildId = useWindowsStore(
    (state) => state["online-players"].state.filtersByGuildId,
  );
  const setOnlinePlayersFilters = useWindowsStore(
    (state) => state.setOnlinePlayersFilters,
  );
  const { data: guildMembers } = useGuildMembersSummary(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: !!guildId && guildId !== "all",
        select: mapGuildMembersByUserId,
      },
    },
  );
  const [searchQuery, setSearchQuery] = useState("");
  const filters = guildId
    ? (filtersByGuildId[guildId] ?? DEFAULT_ONLINE_PLAYERS_FILTERS)
    : DEFAULT_ONLINE_PLAYERS_FILTERS;

  const handleMinLvlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!guildId) return;

    const numericValue = Number(event.target.value);

    if (Number.isNaN(numericValue)) return;

    const minLvl = clampOnlinePlayerLevel(numericValue);

    setOnlinePlayersFilters(guildId, {
      ...filters,
      minLvl,
      maxLvl: minLvl > filters.maxLvl ? minLvl : filters.maxLvl,
    });
  };

  const handleMaxLvlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!guildId) return;

    const numericValue = Number(event.target.value);

    if (Number.isNaN(numericValue)) return;

    const maxLvl = clampOnlinePlayerLevel(numericValue);

    setOnlinePlayersFilters(guildId, {
      ...filters,
      minLvl: maxLvl < filters.minLvl ? maxLvl : filters.minLvl,
      maxLvl,
    });
  };

  const handleProfessionChange = (profession: ProfessionFilterValue) => {
    if (!guildId) return;

    setOnlinePlayersFilters(guildId, {
      ...filters,
      selectedProfession: profession,
    });
  };

  const missingMemberIds = guildMembers
    ? Object.keys(onlinePlayers).filter((discordId) => !guildMembers[discordId])
    : [];

  useMemberInvalidation(guildId, missingMemberIds);

  const onlinePlayersList = getFilteredMemberEntries(
    onlinePlayers,
    guildMembers,
    searchQuery,
    filters,
  );
  const onlineAccountsList = getFilteredAccountEntries(
    onlinePlayers,
    guildMembers,
    searchQuery,
    filters,
  );

  let listContent: ReactNode;

  if (viewMode === "members" && onlinePlayersList.length > 0) {
    listContent = onlinePlayersList.map(([discordId, presences]) => (
      <OnlinePlayersListEntry
        key={discordId}
        presences={presences}
        guildMember={guildMembers?.[discordId]}
      />
    ));
  } else if (viewMode === "accounts" && onlineAccountsList.length > 0) {
    listContent = onlineAccountsList.map(({ discordId, presence }) => (
      <OnlinePlayersAccountListEntry
        key={`${presence.player?.accountId}-${presence.player?.characterId}`}
        presence={presence}
        guildMember={guildMembers?.[discordId]}
      />
    ));
  } else {
    listContent = (
      <p className="ll:text-gray-400 ll:w-full ll:flex ll:items-center ll:justify-center ll:mt-6">
        {searchQuery ? t("emptyState.notFound") : t("emptyState.noPlayers")}
      </p>
    );
  }

  return (
    <div className="ll:h-full ll:w-full">
      <div className="ll:flex ll:flex-col ll:h-full ll:overflow-hidden ll:pt-1">
        {filtersVisible && (
          <>
            <div className="ll:flex ll:gap-1 ll:pb-1">
              <GuildSwitcher />
            </div>
            {allowWorldSelection && <WorldSelector />}

            <OnlinePlayersFilters
              searchQuery={searchQuery}
              filters={filters}
              onSearchChange={(event) => setSearchQuery(event.target.value)}
              onMinLvlChange={handleMinLvlChange}
              onMaxLvlChange={handleMaxLvlChange}
              onProfessionChange={handleProfessionChange}
            />
          </>
        )}
        <ScrollArea className="ll:flex-1 ll:box-border ll:mt-1" type="hover">
          {listContent}
        </ScrollArea>
      </div>
    </div>
  );
};
