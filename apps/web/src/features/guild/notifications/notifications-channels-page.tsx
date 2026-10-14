import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { ListToolbar } from "@/components/common/list-toolbar";
import type { NotificationTargetResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationChannelRow } from "./components/notification-channel-row";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationsInfoButton } from "./components/notifications-info-button";
import { NotificationsTabs } from "./components/notifications-tabs";
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
    if (overview.isLoading) return <NotificationChannelRowsSkeleton />;

    if (channels.length === 0) {
      return (
        <p
          data-list-tile
          className={cn(
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
            "py-6 text-sm text-muted-foreground",
          )}
        >
          {normalizedSearch
            ? t("settings.notifications.empty.filteredTargets")
            : t("settings.notifications.empty.targets")}
        </p>
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
      <div className="flex h-full min-h-0 flex-col">
        <h1 className="sr-only">{t("settings.notifications.tabs.channels")}</h1>
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <NotificationsTabs />
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
                  disabled={!hasRequiredPermissions}
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
        </ScrollArea>
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
