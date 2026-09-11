import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { AsyncContent } from "@/components/async-content";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/hooks/api/use-user-preferences";

import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type VisibilityFilter = "all" | "visible" | "hidden";

const VISIBILITY_FILTERS: VisibilityFilter[] = ["all", "visible", "hidden"];

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

  return (
    <SettingsTabLayout>
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
            controlId="server-visibility"
            title={t("settings.servers.listTitle")}
            description={`${t("settings.servers.visibleCount", {
              count: visibleCount,
            })} · ${t("settings.servers.hiddenCount", { count: hiddenCount })}`}
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
            <div className="ll:flex ll:items-center ll:gap-2 ll:px-2 ll:pb-1">
              <search className="ll:flex ll:min-w-0 ll:flex-1">
                <SearchInput
                  value={query}
                  placeholder={t("settings.servers.searchPlaceholder")}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </search>
              <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                value={[visibilityFilter]}
                onValueChange={([value]: VisibilityFilter[]) => {
                  if (value) setVisibilityFilter(value);
                }}
              >
                {VISIBILITY_FILTERS.map((filter) => (
                  <ToggleGroupItem key={filter} value={filter}>
                    {t(`settings.servers.filters.${filter}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {filteredGuilds.length === 0 ? (
              <SettingsEmptyState>
                {t("settings.servers.noResults")}
              </SettingsEmptyState>
            ) : (
              filteredGuilds.map((guild) => {
                const isVisible = !hiddenGuildIdSet.has(guild.id);
                const switchId = `server-visibility-${guild.id}`;

                return (
                  <SettingsRow
                    key={guild.id}
                    htmlFor={switchId}
                    label={
                      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-2.5">
                        <Avatar className="ll:size-6 ll:shrink-0 ll:rounded-md ll:border ll:border-white/10 ll:bg-black/20">
                          {guild.icon ? (
                            <img
                              src={guild.icon}
                              alt=""
                              className="ll:h-full ll:w-full ll:object-cover"
                            />
                          ) : (
                            <AvatarFallback
                              aria-hidden
                              className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-md ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100"
                            >
                              {guild.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="ll:truncate">{guild.name}</span>
                      </span>
                    }
                    disabled={updatePreferences.isPending}
                  >
                    <Switch
                      id={switchId}
                      checked={isVisible}
                      disabled={updatePreferences.isPending}
                      onCheckedChange={(checked) =>
                        updateGuildVisibility(guild.id, checked)
                      }
                    />
                  </SettingsRow>
                );
              })
            )}
          </SettingsSection>
        )}
      </AsyncContent>
    </SettingsTabLayout>
  );
};
