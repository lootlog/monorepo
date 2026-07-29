import { AsyncContent } from "@/components/async-content";
import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/hooks/api/use-user-preferences";
import { orderLootlogGuilds } from "@/lib/selected-lootlog-guild";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/api-client/react-query/main/users";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type VisibilityFilter = "all" | "visible" | "hidden";

export const ServerVisibilitySettingsTab = () => {
  const { t } = useTranslation();
  const guildsQuery = useUsersControllerGetCurrentUserAccessibleGuilds();
  const preferencesQuery = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);
  const orderedGuilds = orderLootlogGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );
  const visibleCount = orderedGuilds.filter(
    (guild) => !hiddenGuildIdSet.has(guild.id),
  ).length;
  const hiddenCount = orderedGuilds.length - visibleCount;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGuilds = orderedGuilds.filter((guild) => {
    const isHidden = hiddenGuildIdSet.has(guild.id);
    if (visibilityFilter === "visible" && isHidden) {
      return false;
    }
    if (visibilityFilter === "hidden" && !isHidden) {
      return false;
    }

    return guild.name.toLocaleLowerCase().includes(normalizedQuery);
  });
  const accessibleGuildIdSet = new Set(orderedGuilds.map((guild) => guild.id));

  const updateGuildVisibility = (guildId: string, isVisible: boolean) => {
    const nextHiddenGuildIds = isVisible
      ? hiddenGuildIds.filter((hiddenGuildId) => hiddenGuildId !== guildId)
      : [...hiddenGuildIds, guildId];

    updatePreferences.mutate({ hiddenGuildIds: nextHiddenGuildIds });
  };

  let saveStatus: string | null = null;
  if (updatePreferences.isPending) {
    saveStatus = t("settings.servers.saving");
  } else if (updatePreferences.isError) {
    saveStatus = t("settings.servers.saveError");
  } else if (updatePreferences.isSuccess) {
    saveStatus = t("settings.servers.saved");
  }

  return (
    <SettingsTabLayout
      title={t("settings.servers.title")}
      description={t("settings.servers.description")}
      actions={
        saveStatus ? (
          <div className="ll:flex ll:items-center ll:gap-2">
            <span
              aria-live="polite"
              className="ll:text-[11px] ll:text-gray-400"
            >
              {saveStatus}
            </span>
            {updatePreferences.isError && updatePreferences.variables ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  updatePreferences.mutate(updatePreferences.variables)
                }
              >
                {t("actions.retry")}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <AsyncContent
        error={guildsQuery.error ?? preferencesQuery.error}
        errorLabel={t("settings.servers.loadError")}
        isLoading={guildsQuery.isLoading || preferencesQuery.isLoading}
        loadingLabel={t("settings.servers.loading")}
        retryLabel={t("actions.retry")}
        onRetry={() => {
          void guildsQuery.refetch();
          void preferencesQuery.refetch();
        }}
      >
        {orderedGuilds.length === 0 ? (
          <SettingsEmptyState>
            {t("settings.servers.noGuilds")}
          </SettingsEmptyState>
        ) : (
          <SettingsSection
            title={t("settings.servers.listTitle")}
            actions={
              <Button
                type="button"
                variant="ghost"
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
            }
          >
            <div role="search" className="ll:w-full">
              <SearchInput
                value={query}
                placeholder={t("settings.servers.searchPlaceholder")}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="ll:flex ll:flex-wrap ll:items-center ll:justify-between ll:gap-2">
              <div className="ll:flex ll:gap-1">
                {(["all", "visible", "hidden"] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    variant="ghost"
                    aria-pressed={visibilityFilter === filter}
                    className="ll:px-2 ll:aria-pressed:border-purple-400 ll:aria-pressed:bg-purple-500/20"
                    onClick={() => setVisibilityFilter(filter)}
                  >
                    {t(`settings.servers.filters.${filter}`)}
                  </Button>
                ))}
              </div>
              <div className="ll:flex ll:items-center ll:gap-2">
                <span className="ll:text-[11px] ll:text-gray-400">
                  {t("settings.servers.visibleCount", { count: visibleCount })}
                </span>
                <span className="ll:text-[11px] ll:text-gray-400">
                  {t("settings.servers.hiddenCount", { count: hiddenCount })}
                </span>
              </div>
            </div>
            {filteredGuilds.length === 0 ? (
              <SettingsEmptyState>
                {t("settings.servers.noResults")}
              </SettingsEmptyState>
            ) : (
              filteredGuilds.map((guild) => {
                const isVisible = !hiddenGuildIdSet.has(guild.id);

                return (
                  <SettingsControlRow
                    key={guild.id}
                    id={`server-visibility-${guild.id}`}
                    label={
                      <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-2.5">
                        <Avatar className="ll:size-8 ll:shrink-0 ll:rounded-md ll:border ll:border-white/10 ll:bg-black/20">
                          {guild.icon ? (
                            <img
                              src={guild.icon}
                              alt={guild.name}
                              className="ll:h-full ll:w-full ll:object-cover"
                            />
                          ) : (
                            <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-md ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
                              {guild.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="ll:truncate">{guild.name}</span>
                      </div>
                    }
                    disabled={updatePreferences.isPending}
                  >
                    <Switch
                      checked={isVisible}
                      disabled={updatePreferences.isPending}
                      aria-label={t("settings.servers.switchLabel", {
                        name: guild.name,
                      })}
                      onCheckedChange={(checked) =>
                        updateGuildVisibility(guild.id, checked)
                      }
                    />
                  </SettingsControlRow>
                );
              })
            )}
          </SettingsSection>
        )}
      </AsyncContent>
    </SettingsTabLayout>
  );
};
