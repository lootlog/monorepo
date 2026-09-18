import { AsyncContent } from "@/components/async-content";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsToolbar } from "@/components/settings/settings-toolbar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ServerOrderList } from "@/features/settings/components/servers/server-order-list";
import { useUpdateUserPreferences } from "@/hooks/api/use-user-preferences";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { filterGuildsByVisibility } from "@lootlog/domain/guild-preferences";

import { useState } from "react";
import { useTranslation } from "react-i18next";

type VisibilityFilter = "all" | "visible" | "hidden";

const VISIBILITY_FILTERS: VisibilityFilter[] = ["all", "visible", "hidden"];

export const ServerVisibilitySettingsTab = () => {
  const { t } = useTranslation();
  const { guildsQuery, preferencesQuery, orderedGuilds } = useLootlogGuilds();
  const updatePreferences = useUpdateUserPreferences();
  const [query, setQuery] = useState("");

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  const visibleGuildIds = orderedGuilds.flatMap((guild) =>
    hiddenGuildIdSet.has(guild.id) ? [] : [guild.id],
  );

  const hiddenGuildCount = orderedGuilds.length - visibleGuildIds.length;
  const hasHiddenGuilds = hiddenGuildCount > 0;

  const filteredGuilds = filterGuildsByVisibility(
    orderedGuilds,
    hiddenGuildIds,
    visibilityFilter,
    query,
  );

  const accessibleGuildIdSet = new Set(orderedGuilds.map((guild) => guild.id));
  const isFiltered = query.trim() !== "" || visibilityFilter !== "all";

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

  // The full order is sent, so servers not in the stored order (new ones)
  // keep their place instead of trailing behind the dragged one.
  const reorderGuilds = (guildIds: string[]) => {
    updatePreferences.mutateFromCurrent(() => ({ guildsOrder: guildIds }));
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
            description={`${t("settings.servers.description")} ${t("settings.servers.order.description")}`}
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
              <ServerOrderList
                aria-label={t("settings.servers.listTitle")}
                guilds={filteredGuilds}
                selectedGuildIds={visibleGuildIds}
                onToggle={toggleGuildVisibility}
                onReorder={reorderGuilds}
                reorderDisabled={isFiltered}
              />
            )}
          </SettingsSection>
        )}
      </AsyncContent>
    </SettingsTabLayout>
  );
};
