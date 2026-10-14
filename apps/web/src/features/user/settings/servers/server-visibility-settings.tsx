import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ListToolbar } from "@/components/common/list-toolbar";
import { SettingsClearFilterButton } from "@/components/common/settings-clear-filter-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import {
  filterGuildsByVisibility,
  orderGuilds,
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import { cn } from "cn";
import { Eye, EyeOff, SearchX, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const VISIBILITY_FILTERS = ["all", "visible", "hidden"] as const;

type VisibilityFilter = (typeof VISIBILITY_FILTERS)[number];

const showPreferencesSaved = ({
  isError,
  isPending,
  isSuccess,
}: {
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
}) => isSuccess && !isPending && !isError;

/** Which Lootlogs the game client shows: one switch per Lootlog. */
export const ServerVisibilitySettings = () => {
  const { t } = useTranslation();
  const guildsQuery = useUsersControllerGetCurrentUserGuilds();
  const preferencesQuery = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [query, setQuery] = useState("");

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  const orderedGuilds = orderGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );

  // The pills count the Lootlogs the name filter leaves, so each shows where
  // a name can be found.
  const searchedGuilds = filterGuildsByVisibility(
    orderedGuilds,
    hiddenGuildIds,
    "all",
    query,
  );

  const searchedHiddenCount = searchedGuilds.filter((guild) =>
    hiddenGuildIdSet.has(guild.id),
  ).length;

  const filterCounts: Record<VisibilityFilter, number> = {
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

  const updateGuildVisibility = (guildId: string, isVisible: boolean) => {
    updatePreferences.mutate({
      hiddenGuildIds: isVisible
        ? hiddenGuildIds.filter((hiddenGuildId) => hiddenGuildId !== guildId)
        : [...hiddenGuildIds, guildId],
    });
  };

  const showAll = () => {
    setIsShowingAll(true);
    updatePreferences.mutate(
      {
        hiddenGuildIds: hiddenGuildIds.filter(
          (hiddenGuildId) => !accessibleGuildIdSet.has(hiddenGuildId),
        ),
      },
      { onSettled: () => setIsShowingAll(false) },
    );
  };

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
          action={
            query.trim() ? (
              <SettingsClearFilterButton onClear={() => setQuery("")} />
            ) : undefined
          }
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
                onCheckedChange={(checked) =>
                  updateGuildVisibility(guild.id, checked)
                }
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
      <ListToolbar
        search={query}
        onSearchChange={setQuery}
        placeholder={t("settings.servers.searchPlaceholder")}
        label={t("settings.servers.searchPlaceholder")}
        clearLabel={t("settings.clearFilter")}
        disabled={orderedGuilds.length === 0}
      >
        {/* On phones the pills scroll sideways in one row under the filter. */}
        <div className="max-sm:order-last max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] max-sm:overflow-x-auto max-sm:px-3 max-sm:[scrollbar-width:none]">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={1.5}
            value={[visibilityFilter]}
            // One filter is always chosen: pressing it again keeps it.
            onValueChange={([pressed]) => {
              const filter = VISIBILITY_FILTERS.find(
                (value) => value === pressed,
              );

              if (filter) setVisibilityFilter(filter);
            }}
            aria-label={t("settings.servers.visibilityFilterLabel")}
            className="flex-wrap max-sm:w-max max-sm:flex-nowrap"
          >
            {VISIBILITY_FILTERS.map((filter) => (
              <ToggleGroupItem
                key={filter}
                value={filter}
                className={FILTER_PILL_CLASS}
              >
                {t(`settings.servers.filters.${filter}`)}
                <span className="text-muted-foreground tabular-nums">
                  {filterCounts[filter]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
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
      </ListToolbar>

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
            <Button
              size="sm"
              variant="outline"
              loading={isRetrying}
              onClick={() => {
                setIsRetrying(true);
                updatePreferences.mutate(updatePreferences.variables, {
                  onSettled: () => setIsRetrying(false),
                });
              }}
            >
              {t("common.actions.retry")}
            </Button>
          ) : null}
        </div>
      )}

      {renderContent()}
    </SettingsTabPage>
  );
};
