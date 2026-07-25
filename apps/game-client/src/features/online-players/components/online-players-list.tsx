import { GuildSwitcher } from "@/components/guild-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorldSelector } from "@/components/world-selector";
import { OnlinePlayersAccountListEntry } from "@/features/online-players/components/online-players-account-list-entry";
import { OnlinePlayersFilters } from "@/features/online-players/components/online-players-filters";
import { OnlinePlayersListEntry } from "@/features/online-players/components/online-players-list-entry";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { useOnlinePlayersStore } from "@/store/online-players.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import { useState, type ChangeEvent, type FC, type ReactNode } from "react";
import { useGameStore } from "@/store/game.store";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_ONLINE_PLAYERS_FILTERS,
  clampOnlinePlayerLevel,
  getFilteredAccountEntries,
  getFilteredMemberEntries,
  type ProfessionFilterValue,
} from "@/features/online-players/online-players-list.helpers";
import { useShallow } from "zustand/react/shallow";
import { AsyncContent } from "@/components/async-content";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { SearchX, ShieldX, UsersRound } from "lucide-react";

type OnlinePlayersListProps = {
  viewMode: OnlinePlayersViewMode;
  filtersVisible: boolean;
};

export const OnlinePlayersList: FC<OnlinePlayersListProps> = ({
  viewMode,
  filtersVisible,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const defaultWorld = useGameStore((state) => state.game?.world ?? "unknown");

  const { allowWorldSelection, guildIdByCharId, worldByGuildId } =
    useSettingsStore(
      useShallow((state) => ({
        allowWorldSelection: state.allowWorldSelection,
        guildIdByCharId: state.guildIdByCharId,
        worldByGuildId: state.worldByGuildId,
      })),
    );
  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const {
    accessState,
    error,
    hasLoaded,
    initialLoading,
    onlinePlayers,
    refreshing,
    retry,
    stale,
  } = usePlayersPresence(guildId, world ?? defaultWorld);
  const filtersByGuildId = useOnlinePlayersStore(
    (state) => state.filtersByGuildId,
  );
  const setFilters = useOnlinePlayersStore((state) => state.setFilters);
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
  const areFiltersActive =
    searchQuery.trim().length > 0 ||
    filters.minLvl !== DEFAULT_ONLINE_PLAYERS_FILTERS.minLvl ||
    filters.maxLvl !== DEFAULT_ONLINE_PLAYERS_FILTERS.maxLvl ||
    filters.selectedProfession !==
      DEFAULT_ONLINE_PLAYERS_FILTERS.selectedProfession;

  const handleMinLvlChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!guildId) return;

    const numericValue = Number(event.target.value);

    if (Number.isNaN(numericValue)) return;

    const minLvl = clampOnlinePlayerLevel(numericValue);

    setFilters(guildId, {
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

    setFilters(guildId, {
      ...filters,
      minLvl: maxLvl < filters.minLvl ? maxLvl : filters.minLvl,
      maxLvl,
    });
  };

  const handleProfessionChange = (profession: ProfessionFilterValue) => {
    if (!guildId) return;

    setFilters(guildId, {
      ...filters,
      selectedProfession: profession,
    });
  };
  const handleResetFilters = () => {
    setSearchQuery("");
    if (!guildId) return;

    setFilters(guildId, { ...DEFAULT_ONLINE_PLAYERS_FILTERS });
  };

  const missingMemberIds = guildMembers
    ? Object.keys(onlinePlayers).filter((discordId) => !guildMembers[discordId])
    : [];

  useMemberInvalidation(guildId, missingMemberIds);

  const filteredEmptyState = (
    <EmptyState
      action={
        <Button
          className="ll:h-6 ll:px-2.5"
          onClick={handleResetFilters}
          type="button"
          variant="ghost"
        >
          {t("emptyState.clearFilters")}
        </Button>
      }
      icon={SearchX}
      title={t("emptyState.notFoundTitle")}
    />
  );
  const noPlayersEmptyState = (
    <EmptyState icon={UsersRound} title={t("emptyState.noPlayersTitle")} />
  );
  let listContent: ReactNode;

  if (accessState === "forbidden") {
    listContent = (
      <EmptyState icon={ShieldX} title={t("emptyState.noAccessTitle")} />
    );
  } else if (viewMode === "members") {
    const onlinePlayersList = getFilteredMemberEntries(
      onlinePlayers,
      guildMembers,
      searchQuery,
      filters,
    );

    listContent =
      onlinePlayersList.length > 0 ? (
        <ScrollArea className="ll:h-full ll:w-full ll:box-border">
          {onlinePlayersList.map(([discordId, presences]) => (
            <OnlinePlayersListEntry
              key={discordId}
              presences={presences}
              guildMember={guildMembers?.[discordId]}
            />
          ))}
        </ScrollArea>
      ) : areFiltersActive ? (
        filteredEmptyState
      ) : (
        noPlayersEmptyState
      );
  } else {
    const onlineAccountsList = getFilteredAccountEntries(
      onlinePlayers,
      guildMembers,
      searchQuery,
      filters,
    );

    listContent =
      onlineAccountsList.length > 0 ? (
        <ScrollArea className="ll:h-full ll:w-full ll:box-border">
          {onlineAccountsList.map(({ discordId, presence }) => (
            <OnlinePlayersAccountListEntry
              key={`${presence.player?.accountId}-${presence.player?.characterId}`}
              presence={presence}
              guildMember={guildMembers?.[discordId]}
            />
          ))}
        </ScrollArea>
      ) : areFiltersActive ? (
        filteredEmptyState
      ) : (
        noPlayersEmptyState
      );
  }

  return (
    <div className="ll:relative ll:h-full ll:w-full">
      <div className="ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20">
        <AsyncStatusIndicator
          active={hasLoaded && Boolean(error)}
          kind="error"
          label={t("states.refreshError")}
          onRetry={retry}
          retryLabel={t("actions.retry", { ns: "common" })}
        />
        <AsyncStatusIndicator
          active={!error && stale}
          kind="warning"
          label={t("states.offline")}
        />
        <AsyncStatusIndicator
          active={!stale && !error && refreshing}
          delay
          kind="loading"
          label={t("states.refreshing")}
        />
      </div>
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
        <div className="ll:flex ll:min-h-0 ll:flex-1 ll:w-full ll:box-border ll:mt-1">
          <AsyncContent
            error={!hasLoaded ? error : null}
            errorLabel={t("states.loadError")}
            isLoading={initialLoading}
            loadingLabel={t("states.loading")}
            onRetry={retry}
            retryLabel={t("actions.retry", { ns: "common" })}
          >
            {listContent}
          </AsyncContent>
        </div>
      </div>
    </div>
  );
};
