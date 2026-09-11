import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { AsyncContent } from "@/components/async-content";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsToolbar } from "@/components/settings/settings-toolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "cn";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/hooks/api/use-user-preferences";

import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type VisibilityFilter = "all" | "visible" | "hidden";

const VISIBILITY_FILTERS: VisibilityFilter[] = ["all", "visible", "hidden"];

const REVEAL_STAGGER_MS = 40;

/** Rows brought back by "show all" light up one after another. */
const REVEALED_ROW_CLASS_NAME =
  "ll:animate-in ll:fade-in-0 ll:slide-in-from-left-1 ll:fill-mode-backwards ll:duration-300 ll:ease-[cubic-bezier(0.2,0,0,1)]";

export const ServerVisibilitySettingsTab = () => {
  const { t } = useTranslation();
  const guildsQuery = useUsersControllerGetCurrentUserAccessibleGuilds();
  const preferencesQuery = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [query, setQuery] = useState("");

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  /** Guilds revealed by the last "show all", in list order; `at` counts batches. */
  const [revealBatch, setRevealBatch] = useState<{
    at: number;
    guildIds: string[];
  } | null>(null);

  const hiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];
  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  const orderedGuilds = orderLootlogGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
  );

  const hiddenGuildCount = orderedGuilds.filter((guild) =>
    hiddenGuildIdSet.has(guild.id),
  ).length;

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
          <>
            <SettingsSection
              controlId="server-visibility"
              title={t("settings.servers.listTitle")}
              description={t("settings.servers.description")}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasHiddenGuilds || updatePreferences.isPending}
                  onClick={() => {
                    const guildIds = orderedGuilds
                      .filter((guild) => hiddenGuildIdSet.has(guild.id))
                      .map((guild) => guild.id);

                    setRevealBatch((previous) => ({
                      at: (previous?.at ?? 0) + 1,
                      guildIds,
                    }));

                    updatePreferences.mutate({
                      hiddenGuildIds: hiddenGuildIds.filter(
                        (hiddenGuildId) =>
                          !accessibleGuildIdSet.has(hiddenGuildId),
                      ),
                    });
                  }}
                >
                  {hasHiddenGuilds
                    ? t("settings.servers.showAllCount", {
                        count: hiddenGuildCount,
                      })
                    : t("settings.servers.showAll")}
                </Button>
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
                filteredGuilds.map((guild) => {
                  const isVisible = !hiddenGuildIdSet.has(guild.id);
                  const switchId = `server-visibility-${guild.id}`;

                  const revealIndex =
                    revealBatch?.guildIds.indexOf(guild.id) ?? -1;

                  const revealed = isVisible && revealIndex >= 0;

                  return (
                    <SettingsListRow
                      key={
                        revealed ? `${guild.id}-${revealBatch?.at}` : guild.id
                      }
                      className={cn(revealed && REVEALED_ROW_CLASS_NAME)}
                      style={
                        revealed
                          ? {
                              animationDelay: `${revealIndex * REVEAL_STAGGER_MS}ms`,
                            }
                          : undefined
                      }
                      leading={
                        <Avatar
                          className={cn(
                            "ll:size-6 ll:rounded ll:bg-black/20 ll:transition-opacity ll:duration-200",
                            !isVisible && "ll:opacity-50",
                          )}
                        >
                          {guild.icon ? (
                            <img
                              src={guild.icon}
                              alt=""
                              className="ll:h-full ll:w-full ll:object-cover"
                            />
                          ) : (
                            <AvatarFallback
                              aria-hidden
                              className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-sm ll:text-[11px] ll:font-semibold"
                            >
                              {guild.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      }
                      title={
                        <label
                          htmlFor={switchId}
                          className={cn(
                            "ll-custom-cursor-pointer ll:block ll:truncate ll:transition-colors ll:duration-200",
                            !isVisible && "ll:text-muted-foreground",
                          )}
                        >
                          {guild.name}
                        </label>
                      }
                    >
                      <Switch
                        id={switchId}
                        checked={isVisible}
                        disabled={updatePreferences.isPending}
                        onCheckedChange={(checked) =>
                          updateGuildVisibility(guild.id, checked)
                        }
                      />
                    </SettingsListRow>
                  );
                })
              )}
            </SettingsSection>
          </>
        )}
      </AsyncContent>
    </SettingsTabLayout>
  );
};
