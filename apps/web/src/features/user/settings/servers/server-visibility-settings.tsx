import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
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
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Switch } from "@lootlog/ui/components/switch";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import {
  CircleAlert,
  Eye,
  EyeOff,
  RotateCcw,
  SearchX,
  Server,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/common/empty-state";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type VisibilityFilter = "all" | "visible" | "hidden";

const getServerVisibilityViewState = (
  isLoading: boolean,
  loadError: Error | null,
  guildCount: number,
) => ({
  showEmpty: !isLoading && !loadError && guildCount === 0,
  showGuilds: !isLoading && !loadError && guildCount > 0,
  showLoadError: !isLoading && Boolean(loadError),
});

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
    useState<VisibilityFilter>("all");

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  const orderedGuilds = orderGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );

  const visibleCount = orderedGuilds.filter(
    (guild) => !hiddenGuildIdSet.has(guild.id),
  ).length;

  const hiddenCount = orderedGuilds.length - visibleCount;

  const filteredGuilds = filterGuildsByVisibility(
    orderedGuilds,
    hiddenGuildIds,
    visibilityFilter,
    query,
  );

  const accessibleGuildIdSet = new Set(orderedGuilds.map((guild) => guild.id));
  const isLoading = guildsQuery.isLoading || preferencesQuery.isLoading;
  const loadError = guildsQuery.error ?? preferencesQuery.error;

  const { showEmpty, showGuilds, showLoadError } = getServerVisibilityViewState(
    isLoading,
    loadError,
    orderedGuilds.length,
  );

  const isSaved = showPreferencesSaved(updatePreferences);

  const updateGuildVisibility = (guildId: string, isVisible: boolean) => {
    updatePreferences.mutate({
      hiddenGuildIds: isVisible
        ? hiddenGuildIds.filter((hiddenGuildId) => hiddenGuildId !== guildId)
        : [...hiddenGuildIds, guildId],
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("settings.servers.title")}</h1>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-3 pb-3">
          <span aria-live="polite" className="sr-only">
            {updatePreferences.isPending ? t("settings.servers.saving") : null}
            {isSaved ? t("settings.servers.saved") : null}
          </span>

          {isLoading ? (
            <SectionCard
              role="status"
              aria-label={t("settings.servers.loading")}
            >
              <SectionCardHeader
                icon={Server}
                title={t("settings.servers.title")}
                description={
                  <span className="flex h-lh items-center">
                    <Skeleton render={<span />} className="block h-3 w-40" />
                  </span>
                }
                actions={<Skeleton className="h-9 w-36 rounded-md" />}
              />
              <TableFilterToolbar>
                <Skeleton className="h-10 w-full min-w-0 rounded-xl sm:min-w-[200px] sm:flex-1" />
                <Skeleton className="h-10 w-full shrink-0 rounded-md sm:w-56" />
              </TableFilterToolbar>
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {showLoadError ? (
            <div role="alert">
              <EmptyState
                framed
                icon={CircleAlert}
                title={t("settings.servers.loadError")}
                action={
                  <Button
                    variant="outline"
                    loading={
                      guildsQuery.isFetching || preferencesQuery.isFetching
                    }
                    icon=<RotateCcw />
                    onClick={() => {
                      void guildsQuery.refetch();
                      void preferencesQuery.refetch();
                    }}
                  >
                    {t("common.actions.retry")}
                  </Button>
                }
              />
            </div>
          ) : null}

          {showEmpty ? (
            <EmptyState
              framed
              icon={Server}
              title={t("settings.servers.noGuilds")}
            />
          ) : null}

          {showGuilds ? (
            <SectionCard className="overflow-hidden">
              <SectionCardHeader
                icon={Server}
                title={t("settings.servers.title")}
                description={
                  <span className="tabular-nums">
                    {t("settings.servers.visibleCount", {
                      count: visibleCount,
                    })}
                    {" · "}
                    {t("settings.servers.hiddenCount", {
                      count: hiddenCount,
                    })}
                  </span>
                }
                actions={
                  <Button
                    variant="outline"
                    icon=<Eye />
                    disabled={hiddenCount === 0 || updatePreferences.isPending}
                    loading={isShowingAll}
                    onClick={() => {
                      setIsShowingAll(true);
                      updatePreferences.mutate(
                        {
                          hiddenGuildIds: hiddenGuildIds.filter(
                            (hiddenGuildId) =>
                              !accessibleGuildIdSet.has(hiddenGuildId),
                          ),
                        },
                        { onSettled: () => setIsShowingAll(false) },
                      );
                    }}
                  >
                    {t("settings.servers.showAll")}
                  </Button>
                }
              />
              <TableFilterToolbar
                role="group"
                aria-label={t("settings.filtersLabel")}
              >
                <SearchInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("settings.servers.searchPlaceholder")}
                  aria-label={t("settings.servers.searchPlaceholder")}
                  wrapperClassName="h-10 w-full min-w-0 sm:min-w-[200px] sm:flex-1"
                />
                <AnimatedToggleGroup
                  label={t("settings.servers.visibilityFilterLabel")}
                  value={visibilityFilter}
                  onValueChange={setVisibilityFilter}
                  size="large"
                  className="w-full shrink-0 sm:w-auto"
                  options={(["all", "visible", "hidden"] as const).map(
                    (filter) => ({
                      value: filter,
                      label: t(`settings.servers.filters.${filter}`),
                    }),
                  )}
                />
              </TableFilterToolbar>

              {updatePreferences.isError || isRetrying ? (
                <div
                  className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-3 py-2"
                  role="alert"
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
              ) : null}

              {filteredGuilds.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={t("settings.servers.noResults")}
                  className="min-h-48"
                />
              ) : (
                <div className="divide-y divide-border">
                  {filteredGuilds.map((guild) => {
                    const isHidden = hiddenGuildIdSet.has(guild.id);

                    return (
                      <div
                        key={guild.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <Avatar className="size-9 rounded-lg">
                          <AvatarImage
                            src={guild.icon ?? undefined}
                            alt={guild.name}
                          />
                          <AvatarFallback>
                            {guild.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {guild.name}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            {isHidden ? (
                              <>
                                <EyeOff className="size-3" />
                                {t("settings.servers.hiddenInGameClient")}
                              </>
                            ) : (
                              t("settings.servers.visibleInGameClient")
                            )}
                          </p>
                        </div>
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
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};
