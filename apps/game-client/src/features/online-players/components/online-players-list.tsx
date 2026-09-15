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
import { cn } from "cn";
import { ConnectionStatusStrip } from "@/components/connection-status-strip";
import { toolbarStripClassName } from "@/components/ui/toolbar-strip";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { SearchX, ShieldX, UsersRound } from "lucide-react";

type OnlinePlayersListProps = {
  viewMode: OnlinePlayersViewMode;
  filtersVisible: boolean;
};

const areOnlinePlayerFiltersActive = (
  searchQuery: string,
  filters: typeof DEFAULT_ONLINE_PLAYERS_FILTERS,
): boolean =>
  [
    searchQuery.trim().length > 0,
    filters.minLvl !== DEFAULT_ONLINE_PLAYERS_FILTERS.minLvl,
    filters.maxLvl !== DEFAULT_ONLINE_PLAYERS_FILTERS.maxLvl,
    filters.selectedProfession !==
      DEFAULT_ONLINE_PLAYERS_FILTERS.selectedProfession,
  ].some(Boolean);

type InitialLoadInput = {
  disconnected: boolean;
  error: unknown;
  guildId: string | undefined;
  guildsQuery: { error: unknown; isLoading: boolean };
  hasLoaded: boolean;
  initialLoading: boolean;
};

type InitialLoad = {
  error: unknown;
  errorLabelKey: "states.loadError" | "states.disconnected";
  loading: boolean;
};

const GATEWAY_OFFLINE = new Error("Realtime gateway is not connected");

/**
 * Without an Organization there is no presence scope to fetch, so the only
 * thing that can load or fail is the Organization list itself. With a scope
 * but no gateway session nothing is requested, which the user must see too.
 */
const resolveInitialLoad = ({
  disconnected,
  error,
  guildId,
  guildsQuery,
  hasLoaded,
  initialLoading,
}: InitialLoadInput): InitialLoad => {
  if (hasLoaded) {
    return { error: null, errorLabelKey: "states.loadError", loading: false };
  }

  if (disconnected) {
    return {
      error: GATEWAY_OFFLINE,
      errorLabelKey: "states.disconnected",
      loading: false,
    };
  }

  if (guildId) {
    return {
      error,
      errorLabelKey: "states.loadError",
      loading: initialLoading,
    };
  }

  return {
    error: error ?? guildsQuery.error,
    errorLabelKey: "states.loadError",
    loading: initialLoading || guildsQuery.isLoading,
  };
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
    disconnected,
    error,
    hasLoaded,
    initialLoading,
    onlinePlayers,
    refreshing,
    retry,
    stale,
  } = usePlayersPresence(guildId, world ?? defaultWorld);

  const { guildsQuery } = useVisibleLootlogGuilds();

  const initialLoad = resolveInitialLoad({
    disconnected,
    error,
    guildId,
    guildsQuery,
    hasLoaded,
    initialLoading,
  });

  const retryAll = () => {
    retry();
    void guildsQuery.refetch();
  };

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

  const areFiltersActive = areOnlinePlayerFiltersActive(searchQuery, filters);

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
          size="xs"
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
        <ScrollArea className="ll:h-full ll:w-full">
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
        <ScrollArea className="ll:h-full ll:w-full">
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
      <div className="ll:flex ll:flex-col ll:h-full ll:overflow-hidden ll:pt-1">
        {filtersVisible && (
          <>
            <div className={cn(toolbarStripClassName, "ll:-mt-px")}>
              <GuildSwitcher variant="strip" />
            </div>
            {allowWorldSelection && (
              <WorldSelector className="ll:-mt-px" variant="strip" />
            )}

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
        <ConnectionStatusStrip
          error={hasLoaded && Boolean(error)}
          errorLabel={t("states.refreshError")}
          offline={stale}
          offlineLabel={t("states.offline")}
          refreshing={refreshing}
          refreshingLabel={t("states.refreshing")}
          onRetry={retry}
        />
        <div className="ll:flex ll:min-h-0 ll:flex-1 ll:w-full ll:px-1 ll:pt-1">
          <AsyncContent
            error={initialLoad.error}
            errorLabel={t(initialLoad.errorLabelKey)}
            isLoading={initialLoad.loading}
            loadingLabel={t("states.loading")}
            onRetry={retryAll}
            retryLabel={t("actions.retry", { ns: "common" })}
          >
            {listContent}
          </AsyncContent>
        </div>
      </div>
    </div>
  );
};
