import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { ListToolbar } from "@/components/common/list-toolbar";
import { SettingsClearFilterButton } from "@/components/common/settings-clear-filter-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import type { NotificationTargetResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Hash, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationChannelRow } from "./components/notification-channel-row";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationsInfoButton } from "./components/notifications-info-button";
import { NotificationChannelRowsSkeleton } from "./notification-channel-rows-skeleton";
import { useNotificationsOverview } from "./use-notifications-overview";
import { getGuildNotificationTargetLabel } from "./utils/notification-settings.utils";

/** The channels tab: the Discord channels rules send to. */
export const NotificationsChannelsPage = () => {
  const { t } = useTranslation();
  const overview = useNotificationsOverview();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [editedTarget, setEditedTarget] =
    useState<NotificationTargetResponseDto>();

  const { hasRequiredPermissions, targets } = overview;
  const normalizedSearch = search.trim().toLocaleLowerCase("pl");

  const channels = targets.filter((target) =>
    getGuildNotificationTargetLabel(target)
      .toLocaleLowerCase("pl")
      .includes(normalizedSearch),
  );

  const renderChannels = () => {
    if (overview.isError) {
      return (
        <SettingsListError
          title={t("settings.notifications.empty.loadError")}
          isRetrying={overview.isRetrying}
          onRetry={overview.retry}
        />
      );
    }

    if (overview.isLoading) return <NotificationChannelRowsSkeleton />;

    if (channels.length === 0) {
      return normalizedSearch ? (
        <SettingsListEmpty
          icon={SearchX}
          title={t("settings.notifications.empty.filteredTargets")}
          description={t("settings.notifications.empty.filteredDescription")}
          action={<SettingsClearFilterButton onClear={() => setSearch("")} />}
        />
      ) : (
        <SettingsListEmpty
          icon={Hash}
          title={t("settings.notifications.empty.targets")}
          description={t("settings.notifications.empty.targetsDescription")}
        />
      );
    }

    return channels.map((target) => (
      <NotificationChannelRow
        key={target.id}
        target={target}
        rules={overview.rules}
        actionsDisabled={!hasRequiredPermissions}
        onEdit={setEditedTarget}
      />
    ));
  };

  return (
    <>
      <h1 className="sr-only">{t("settings.notifications.tabs.channels")}</h1>
      {!hasRequiredPermissions && (
        <div className="px-3 pb-3">
          <GuildDiscordSyncNotice sync={overview.sync} />
        </div>
      )}
      <div>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={t("settings.notifications.channelFilterPlaceholder")}
          label={t("settings.notifications.channelFilterLabel")}
          clearLabel={t("settings.notifications.clearFilter")}
          disabled={overview.isLoading}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!hasRequiredPermissions || overview.isError}
              icon=<Plus className="size-4" />
              onClick={() => setIsCreateOpen(true)}
            >
              {t("settings.notifications.actions.addTargetShort")}
            </Button>
            <NotificationsInfoButton />
          </div>
        </ListToolbar>
        {renderChannels()}
      </div>

      <NotificationTargetDialog
        open={isCreateOpen}
        mode="create"
        existingTargets={targets}
        onOpenChange={setIsCreateOpen}
      />
      <NotificationTargetDialog
        open={editedTarget !== undefined}
        mode="edit"
        target={editedTarget}
        existingTargets={targets}
        onOpenChange={(open) => {
          if (!open) setEditedTarget(undefined);
        }}
      />
    </>
  );
};
