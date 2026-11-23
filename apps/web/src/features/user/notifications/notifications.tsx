import { UserNotificationsPageSkeleton } from "./notifications-page-skeleton";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { BandSection } from "@/components/common/band-section";
import { InfoButton } from "@/components/common/info-button";
import { SettingsListError } from "@/components/common/settings-list-error";
import { DmTargetTile } from "@/features/user/notifications/components/dm-target-tile";
import { UserNotificationsInfoDialog } from "@/features/user/notifications/components/user-notifications-info-dialog";
import { WatchFormDialog } from "@/features/user/notifications/components/watch-item-form-dialog";
import { WatchedItemsSection } from "@/features/user/notifications/components/watched-items-section";
import {
  useNotificationsUserControllerGetUserTargets,
  useNotificationsUserControllerGetWatchedItems,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { useUserLimits } from "@/hooks/api/user/use-user-limits";

export const UserNotifications = () => {
  const { t } = useTranslation();

  const targetsQuery = useNotificationsUserControllerGetUserTargets();

  const watchedItemsQuery = useNotificationsUserControllerGetWatchedItems();

  const limitsQuery = useUserLimits();

  const { data: guilds = [] } =
    useUsersControllerGetCurrentUserAccessibleGuilds();

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isWatchFormOpen, setIsWatchFormOpen] = useState(false);

  const dmTarget = targetsQuery.data?.[0] ?? null;
  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const watchedItems = watchedItemsQuery.data ?? [];

  const isLoading =
    targetsQuery.isLoading ||
    watchedItemsQuery.isLoading ||
    limitsQuery.isLoading;

  const guildOptions = guilds.map((guild) => ({
    value: guild.id,
    label: guild.name,
  }));

  if (isLoading) {
    return <UserNotificationsPageSkeleton />;
  }

  if (!targetsQuery.data || !watchedItemsQuery.data || !limitsQuery.data) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <h1 className="sr-only">{t("settings.userNotifications.title")}</h1>
          <SettingsListError
            title={t("settings.userNotifications.loadError")}
            isRetrying={
              targetsQuery.isFetching ||
              watchedItemsQuery.isFetching ||
              limitsQuery.isFetching
            }
            onRetry={() => {
              void targetsQuery.refetch();
              void watchedItemsQuery.refetch();
              void limitsQuery.refetch();
            }}
          />
        </ScrollArea>
      </div>
    );
  }

  const watchedItemsLimit = limitsQuery.data.watchedItems;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <h1 className="sr-only">{t("settings.userNotifications.title")}</h1>
          <BandSection
            id="user-notifications-dm"
            title={t("settings.userNotifications.dm.sectionTitle")}
            tiled
          >
            <DmTargetTile dmTarget={dmTarget} />
          </BandSection>
          <WatchedItemsSection
            watchedItems={watchedItems}
            watchedItemsLimit={watchedItemsLimit}
            guilds={guilds}
            canAddWatch={hasActiveDm}
            onAddWatch={() => setIsWatchFormOpen(true)}
            trailing={
              <InfoButton
                label={t("settings.userNotifications.infoDialog.title")}
                onClick={() => setIsInfoDialogOpen(true)}
              />
            }
          />
        </ScrollArea>
      </div>

      <UserNotificationsInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
        watchedItemsLimit={watchedItemsLimit}
      />

      <WatchFormDialog
        open={isWatchFormOpen}
        onOpenChange={setIsWatchFormOpen}
        hasActiveDm={hasActiveDm}
        watchedItems={watchedItems}
        watchedItemsLimit={watchedItemsLimit}
        guildOptions={guildOptions}
      />
    </>
  );
};
