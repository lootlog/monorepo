import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { ListToolbar } from "@/components/common/list-toolbar";
import { SettingsClearFilterButton } from "@/components/common/settings-clear-filter-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { BellRing, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationRuleGroups } from "./components/notification-rule-groups";
import { NotificationsInfoButton } from "./components/notifications-info-button";
import { NotificationRuleGroupsSkeleton } from "./notification-rule-groups-skeleton";
import { useNotificationsOverview } from "./use-notifications-overview";
import { getNotificationTriggerTranslationKey } from "./utils/notification-settings.utils";

/** The rules tab: each rule with what it sends, where, and its deliveries. */
export const NotificationsSettings = () => {
  const { t } = useTranslation();
  const overview = useNotificationsOverview();
  const [search, setSearch] = useState("");
  const { guildId, hasRequiredPermissions, limits } = overview;
  const normalizedSearch = search.trim().toLocaleLowerCase("pl");

  const rules = overview.rules.filter((rule) =>
    (rule.name ?? t(getNotificationTriggerTranslationKey(rule.triggerType)))
      .toLocaleLowerCase("pl")
      .includes(normalizedSearch),
  );

  const addRuleLabel = t("settings.notifications.actions.addRule");

  return (
    <>
      <h1 className="sr-only">{t("settings.notifications.title")}</h1>
      {!hasRequiredPermissions && (
        <div className="px-3 pb-3">
          <GuildDiscordSyncNotice sync={overview.sync} />
        </div>
      )}
      <div>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={t("settings.notifications.ruleFilterPlaceholder")}
          label={t("settings.notifications.ruleFilterLabel")}
          clearLabel={t("settings.notifications.clearFilter")}
          disabled={overview.isLoading}
        >
          <div className="flex items-center gap-2">
            {limits && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("settings.notifications.ruleLimitUsage", {
                  count: limits.ruleCount,
                  limit: limits.ruleLimit,
                })}
              </span>
            )}
            {hasRequiredPermissions &&
            !overview.isError &&
            !overview.isRuleLimitReached ? (
              <Button
                size="sm"
                icon=<Plus className="size-4" />
                render={
                  <Link to={ROUTES.guild.notifications.create(guildId)}>
                    {addRuleLabel}
                  </Link>
                }
                nativeButton={false}
              />
            ) : (
              <Button size="sm" disabled icon=<Plus className="size-4" />>
                {addRuleLabel}
              </Button>
            )}
            <NotificationsInfoButton />
          </div>
        </ListToolbar>
        {overview.isError ? (
          <SettingsListError
            title={t("settings.notifications.empty.loadError")}
            isRetrying={overview.isRetrying}
            onRetry={overview.retry}
          />
        ) : overview.isLoading ? (
          <NotificationRuleGroupsSkeleton />
        ) : (
          <NotificationRuleGroups
            overview={overview}
            rules={rules}
            empty={
              normalizedSearch ? (
                <SettingsListEmpty
                  icon={SearchX}
                  title={t("settings.notifications.empty.filteredRules")}
                  description={t(
                    "settings.notifications.empty.filteredDescription",
                  )}
                  action={
                    <SettingsClearFilterButton onClear={() => setSearch("")} />
                  }
                />
              ) : (
                <SettingsListEmpty
                  icon={BellRing}
                  title={t("settings.notifications.empty.rules")}
                  description={t(
                    "settings.notifications.empty.rulesDescription",
                  )}
                />
              )
            }
          />
        )}
      </div>
    </>
  );
};
