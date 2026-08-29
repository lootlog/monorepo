import {
  filterGuildsByVisibility,
  orderGuilds,
} from "@/features/user/settings/servers/server-visibility";
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
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Switch } from "@lootlog/ui/components/switch";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/api-client/react-query/main/users";
import { EyeOff, RotateCcw, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/ui/search-input";

type VisibilityFilter = "all" | "visible" | "hidden";

const getServerVisibilityViewState = (
  isLoading: boolean,
  loadError: unknown,
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 pb-3">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Server className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">
                    {t("settings.servers.title")}
                  </h2>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {t("settings.servers.description")}
                  </p>
                </div>
              </div>
              <span
                aria-live="polite"
                className="shrink-0 text-xs text-muted-foreground"
              >
                {updatePreferences.isPending
                  ? t("settings.servers.saving")
                  : null}
                {isSaved ? t("settings.servers.saved") : null}
              </span>
            </div>
          </Card>

          {isLoading ? (
            <Card className="flex h-64 items-center justify-center bg-card">
              <Spinner className="size-8" />
              <span className="sr-only">{t("settings.servers.loading")}</span>
            </Card>
          ) : null}

          {showLoadError ? (
            <Card
              className="flex h-64 flex-col items-center justify-center gap-3 bg-card"
              role="alert"
            >
              <p className="text-sm text-muted-foreground">
                {t("settings.servers.loadError")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void guildsQuery.refetch();
                  void preferencesQuery.refetch();
                }}
              >
                <RotateCcw className="size-3.5" />
                {t("common.actions.retry")}
              </Button>
            </Card>
          ) : null}

          {showEmpty ? (
            <Card className="flex h-64 flex-col items-center justify-center gap-3 bg-card">
              <Server className="size-10 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("settings.servers.noGuilds")}
              </p>
            </Card>
          ) : null}

          {showGuilds ? (
            <Card className="gap-0 overflow-hidden border-border bg-card p-0">
              <div className="flex flex-col gap-3 border-b border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SearchInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("settings.servers.searchPlaceholder")}
                    className="h-9"
                    wrapperClassName="min-w-0 flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center sm:w-auto"
                    disabled={hiddenCount === 0 || updatePreferences.isPending}
                    onClick={() =>
                      updatePreferences.mutate({
                        hiddenGuildIds: hiddenGuildIds.filter(
                          (hiddenGuildId) =>
                            !accessibleGuildIdSet.has(hiddenGuildId),
                        ),
                      })
                    }
                  >
                    {t("settings.servers.showAll")}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "visible", "hidden"] as const).map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      variant={
                        visibilityFilter === filter ? "secondary" : "ghost"
                      }
                      aria-pressed={visibilityFilter === filter}
                      onClick={() => setVisibilityFilter(filter)}
                    >
                      {t(`settings.servers.filters.${filter}`)}
                    </Button>
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("settings.servers.visibleCount", {
                      count: visibleCount,
                    })}
                    {" · "}
                    {t("settings.servers.hiddenCount", { count: hiddenCount })}
                  </span>
                </div>
              </div>

              {updatePreferences.isError ? (
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
                      onClick={() =>
                        updatePreferences.mutate(updatePreferences.variables)
                      }
                    >
                      {t("common.actions.retry")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {filteredGuilds.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">
                  {t("settings.servers.noResults")}
                </div>
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
            </Card>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};
