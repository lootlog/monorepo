import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { FilterOptionCount } from "@/components/common/filter-option-count";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import {
  filterGuildsByVisibility,
  GUILD_VISIBILITY_FILTERS,
  orderGuilds,
  showAllGuilds,
  toggleHiddenGuild,
  type GuildVisibilityFilter,
} from "@lootlog/domain/guild-preferences";
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/hooks/api/user/use-user-preferences";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Switch } from "@lootlog/ui/components/switch";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import { cn } from "cn";
import { Eye, EyeOff, SearchX, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";

const showPreferencesSaved = ({
  isError,
  isPending,
  isSuccess,
}: {
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
}) => isSuccess && !isPending && !isError;

export const ServerVisibilitySettings = () => {
  const { t } = useTranslation();
  const guildsQuery = useUsersControllerGetCurrentUserGuilds();
  const preferencesQuery = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [query, setQuery] = useState("");

  const [visibilityFilter, setVisibilityFilter] =
    useState<GuildVisibilityFilter>("all");

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  const orderedGuilds = orderGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );

  const searchedGuilds = filterGuildsByVisibility(
    orderedGuilds,
    hiddenGuildIds,
    "all",
    query,
  );

  const searchedHiddenCount = searchedGuilds.filter((guild) =>
    hiddenGuildIdSet.has(guild.id),
  ).length;

  const filterCounts: Record<GuildVisibilityFilter, number> = {
    all: searchedGuilds.length,
    visible: searchedGuilds.length - searchedHiddenCount,
    hidden: searchedHiddenCount,
  };

  const hiddenCount = orderedGuilds.filter((guild) =>
    hiddenGuildIdSet.has(guild.id),
  ).length;

  const filteredGuilds = filterGuildsByVisibility(
    orderedGuilds,
    hiddenGuildIds,
    visibilityFilter,
    query,
  );

  const accessibleGuildIdSet = new Set(orderedGuilds.map((guild) => guild.id));
  const isLoading = guildsQuery.isLoading || preferencesQuery.isLoading;
  const loadError = guildsQuery.error ?? preferencesQuery.error;
  const isSaved = showPreferencesSaved(updatePreferences);

  const toggleGuildVisibility = (guildId: string) => {
    updatePreferences.mutateFromCurrent((current) => ({
      hiddenGuildIds: toggleHiddenGuild(current?.hiddenGuildIds ?? [], guildId),
    }));
  };

  const showAll = () => {
    setIsShowingAll(true);
    updatePreferences.mutateFromCurrent(
      (current) => ({
        hiddenGuildIds: showAllGuilds(
          current?.hiddenGuildIds ?? [],
          accessibleGuildIdSet,
        ),
      }),
      { onSettled: () => setIsShowingAll(false) },
    );
  };

  const clearFilters = () => {
    setQuery("");
    setVisibilityFilter("all");
  };

  const visibilityLabel = (filter: GuildVisibilityFilter) =>
    t(`settings.servers.filters.${filter}`);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div role="status" aria-label={t("settings.servers.loading")}>
          {Array.from({ length: 6 }, (_, index) => (
            <ListTileSkeleton
              key={index}
              trailing={<Skeleton className="h-5 w-8 shrink-0 rounded-full" />}
            />
          ))}
        </div>
      );
    }

    if (loadError) {
      return (
        <div role="alert">
          <SettingsListError
            title={t("settings.servers.loadError")}
            isRetrying={guildsQuery.isFetching || preferencesQuery.isFetching}
            onRetry={() => {
              void guildsQuery.refetch();
              void preferencesQuery.refetch();
            }}
          />
        </div>
      );
    }

    if (orderedGuilds.length === 0) {
      return (
        <SettingsListEmpty
          icon={Server}
          title={t("settings.servers.noGuilds")}
          description={t("settings.servers.noGuildsDescription")}
        />
      );
    }

    if (filteredGuilds.length === 0) {
      return (
        <SettingsListEmpty
          icon={SearchX}
          title={t("settings.servers.noResults")}
          description={t("settings.servers.noResultsDescription")}
          action={<ClearFiltersButton onClear={clearFilters} />}
        />
      );
    }

    return (
      <ul>
        {filteredGuilds.map((guild) => {
          const isHidden = hiddenGuildIdSet.has(guild.id);

          return (
            <li
              key={guild.id}
              data-list-tile
              className={cn(
                "flex items-center gap-3 py-3",
                LIST_TILE_RULE_CLASS,
                LIST_TILE_INSET_CLASS,
              )}
            >
              <Avatar className="size-9 rounded-lg">
                <AvatarImage src={guild.icon ?? undefined} alt="" />
                <AvatarFallback className="rounded-none text-sm font-semibold">
                  {guild.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-semibold">
                  {guild.name}
                </span>
                <span className="flex items-center gap-1.5 text-xs leading-tight text-muted-foreground">
                  {isHidden ? (
                    <EyeOff aria-hidden className="size-3.5 shrink-0" />
                  ) : (
                    <Eye aria-hidden className="size-3.5 shrink-0" />
                  )}
                  {isHidden
                    ? t("settings.servers.hiddenInGameClient")
                    : t("settings.servers.visibleInGameClient")}
                </span>
              </span>
              <Switch
                checked={!isHidden}
                disabled={updatePreferences.isPending}
                aria-label={t("settings.servers.switchLabel", {
                  name: guild.name,
                })}
                onCheckedChange={() => toggleGuildVisibility(guild.id)}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <SettingsTabPage title={t("settings.servers.title")}>
      <span aria-live="polite" className="sr-only">
        {updatePreferences.isPending ? t("settings.servers.saving") : null}
        {isSaved ? t("settings.servers.saved") : null}
      </span>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={query}
            placeholder={t("settings.servers.searchPlaceholder")}
            onChange={setQuery}
          />
        }
        filters={
          <>
            <FilterPopover
              options={GUILD_VISIBILITY_FILTERS.filter(
                (filter) => filter !== "all",
              ).map((filter) => ({
                value: filter,
                label: visibilityLabel(filter),
                render: () => (
                  <FilterOptionCount
                    label={visibilityLabel(filter)}
                    count={filterCounts[filter]}
                  />
                ),
              }))}
              value={visibilityFilter === "all" ? undefined : visibilityFilter}
              onValueChange={(filter) =>
                setVisibilityFilter(
                  filter === visibilityFilter ? "all" : filter,
                )
              }
              placeholder={t("settings.servers.visibilityFilterLabel")}
              icon={Eye}
              showSearch={false}
              active={visibilityFilter !== "all"}
            />
            <Button
              variant="outline"
              size="sm"
              icon=<Eye />
              disabled={hiddenCount === 0 || updatePreferences.isPending}
              loading={isShowingAll}
              onClick={showAll}
            >
              {t("settings.servers.showAll")}
            </Button>
          </>
        }
        filtersLabel={t("settings.servers.visibilityFilterLabel")}
        chips={
          visibilityFilter === "all"
            ? []
            : [
                {
                  id: visibilityFilter,
                  label: visibilityLabel(visibilityFilter),
                  onRemove: () => setVisibilityFilter("all"),
                },
              ]
        }
        clearFiltersLabel={t("common.actions.clearFilters")}
        onClearFilters={clearFilters}
      >
        {(updatePreferences.isError || isRetrying) && (
          <div
            data-list-tile
            role="alert"
            className={cn(
              "flex min-h-12 items-center justify-between gap-3 bg-destructive/[0.06] py-2",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <p className="text-xs text-destructive">
              {t("settings.servers.saveError")}
            </p>
            {updatePreferences.variables ? (
              <RetryButton
                onRetry={() => {
                  setIsRetrying(true);
                  updatePreferences.mutate(updatePreferences.variables, {
                    onSettled: () => setIsRetrying(false),
                  });
                }}
                isRetrying={isRetrying}
                size="sm"
              />
            ) : null}
          </div>
        )}

        {renderContent()}
      </ResultsSurface>
    </SettingsTabPage>
  );
};
