import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { AsyncContent } from "@/components/async-content";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsToolbar } from "@/components/settings/settings-toolbar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
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

  const visibleGuildIds = orderedGuilds.flatMap((guild) =>
    hiddenGuildIdSet.has(guild.id) ? [] : [guild.id],
  );

  const hiddenGuildCount = orderedGuilds.length - visibleGuildIds.length;
  const hasHiddenGuilds = hiddenGuildCount > 0;

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

  // Derived from the cache at click time: rapid clicks each build on the
  // previous optimistic state instead of the one this render was given.
  const toggleGuildVisibility = (guildId: string) => {
    updatePreferences.mutateFromCurrent((current) => {
      const currentHiddenGuildIds = current?.hiddenGuildIds ?? [];

      return {
        hiddenGuildIds: currentHiddenGuildIds.includes(guildId)
          ? currentHiddenGuildIds.filter(
              (hiddenGuildId) => hiddenGuildId !== guildId,
            )
          : [...currentHiddenGuildIds, guildId],
      };
    });
  };

  return (
    <SettingsTabLayout>
      <AsyncContent
        error={guildsQuery.error ?? preferencesQuery.error}
        errorLabel={t("settings.servers.loadError")}
        isLoading={guildsQuery.isLoading || preferencesQuery.isLoading}
        loadingLabel={t("settings.servers.loading")}
        retryLabel={t("actions.retry", { ns: "common" })}
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
            description={t("settings.servers.description")}
            actions={
              <div className="ll:flex ll:items-center ll:gap-3">
                <span className="ll:text-xs ll:leading-4 ll:tabular-nums ll:text-muted-foreground">
                  {t("settings.servers.visibleCount", {
                    visibleCount: visibleGuildIds.length,
                    totalCount: orderedGuilds.length,
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasHiddenGuilds || updatePreferences.isPending}
                  onClick={() => {
                    updatePreferences.mutateFromCurrent((current) => ({
                      hiddenGuildIds: (current?.hiddenGuildIds ?? []).filter(
                        (hiddenGuildId) =>
                          !accessibleGuildIdSet.has(hiddenGuildId),
                      ),
                    }));
                  }}
                >
                  {hasHiddenGuilds
                    ? t("settings.servers.showAllCount", {
                        count: hiddenGuildCount,
                      })
                    : t("settings.servers.showAll")}
                </Button>
              </div>
            }
          >
            <SettingsToolbar
              search={{
                value: query,
                placeholder: t("settings.servers.searchPlaceholder"),
                onChange: (event) => setQuery(event.target.value),
                onClear: () => setQuery(""),
                clearLabel: t("settings.search.clear"),
              }}
            >
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
            </SettingsToolbar>
            {filteredGuilds.length === 0 ? (
              <SettingsEmptyState>
                {t("settings.servers.noResults")}
              </SettingsEmptyState>
            ) : (
              <div className="ll:px-2 ll:py-0.5">
                <SettingsGuildPicker
                  aria-label={t("settings.servers.listTitle")}
                  guilds={filteredGuilds}
                  selectedGuildIds={visibleGuildIds}
                  onToggle={toggleGuildVisibility}
                  emptyStateLabel={t("settings.servers.noResults")}
                />
              </div>
            )}
          </SettingsSection>
        )}
      </AsyncContent>
    </SettingsTabLayout>
  );
};
