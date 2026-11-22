import { BandSection } from "@/components/common/band-section";
import { ListTileEmpty } from "@/components/common/list-tile-empty";
import { Package, Plus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { USER_WATCHED_ITEMS_LIMIT } from "@/lib/user-notifications/user-watched-items-limit";
import { WatchedItemTile } from "@/features/user/notifications/components/watched-item-tile";
import type { WatchedItemResponseDto } from "@lootlog/client/main";

const getWatchedItemGuildIds = (filters: { guildIds?: string[] } | null) =>
  filters?.guildIds ?? [];

type WatchedItemsSectionProps = {
  watchedItems: WatchedItemResponseDto[];
  guilds: Array<{ id: string; name: string }>;
  canAddWatch: boolean;
  onAddWatch: () => void;
  trailing?: ReactNode;
};

export const WatchedItemsSection = ({
  watchedItems,
  guilds,
  canAddWatch,
  onAddWatch,
  trailing,
}: WatchedItemsSectionProps) => {
  const { t } = useTranslation();
  const watchedItemsCount = watchedItems.length;
  const canAdd = canAddWatch && watchedItemsCount < USER_WATCHED_ITEMS_LIMIT;
  const addLabel = t("settings.userNotifications.actions.addWatch");

  return (
    <BandSection
      id="user-notifications-watched-items"
      title={t("settings.userNotifications.watchList.title")}
      description={t("settings.userNotifications.description")}
      count={t("settings.userNotifications.watchLimitStatus", {
        count: watchedItemsCount,
        limit: USER_WATCHED_ITEMS_LIMIT,
      })}
      tiled
      trailing={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            className="max-sm:hidden"
            disabled={!canAdd}
            icon=<Plus className="size-4" />
            onClick={onAddWatch}
          >
            {addLabel}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            className="sm:hidden"
            disabled={!canAdd}
            aria-label={addLabel}
            onClick={onAddWatch}
          >
            <Plus className="size-4" />
          </Button>
          {trailing}
        </div>
      }
    >
      {watchedItemsCount > 0 ? (
        <ul>
          {watchedItems.map((watchedItem) => {
            const selectedGuildIdsForItem = getWatchedItemGuildIds(
              watchedItem.notificationRule?.filters ?? null,
            );

            const guildLabels = selectedGuildIdsForItem
              .map(
                (guildId) => guilds.find((guild) => guild.id === guildId)?.name,
              )
              .filter((label): label is string => Boolean(label));

            const missingGuildIds = selectedGuildIdsForItem.filter(
              (guildId) => !guilds.some((guild) => guild.id === guildId),
            );

            return (
              <WatchedItemTile
                key={watchedItem.id}
                watchedItem={watchedItem}
                guildLabels={guildLabels}
                missingGuildIds={missingGuildIds}
              />
            );
          })}
        </ul>
      ) : (
        <ListTileEmpty icon={Package}>
          {t("settings.userNotifications.empty.watchedItems")}
          {!canAddWatch &&
            ` ${t("settings.userNotifications.dm.requiredHint")}`}
        </ListTileEmpty>
      )}
    </BandSection>
  );
};
