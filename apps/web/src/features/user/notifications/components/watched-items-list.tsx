import { BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import { WatchedItemCard } from "@/features/user/notifications/components/watched-item-card";
import type { WatchedItemResponseDto } from "@lootlog/client/main";

const getWatchedItemGuildIds = (filters: { guildIds?: string[] } | null) =>
  filters?.guildIds ?? [];

type WatchedItemsListProps = {
  watchedItems: WatchedItemResponseDto[];
  guilds: Array<{ id: string; name: string }>;
};

export const WatchedItemsList = ({
  watchedItems,
  guilds,
}: WatchedItemsListProps) => {
  const { t } = useTranslation();
  const watchedItemsCount = watchedItems.length;

  return (
    <Card className="gap-3 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2.5">
          <BellRing className="size-4 text-amber-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            {t("settings.userNotifications.watchList.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.userNotifications.watchList.description")}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {t("settings.userNotifications.watchLimitStatus", {
            count: watchedItemsCount,
            limit: USER_WATCHED_ITEMS_LIMIT,
          })}
        </Badge>
      </div>
      {watchedItemsCount > 0 ? (
        <div className="flex flex-col gap-3">
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
              <WatchedItemCard
                key={watchedItem.id}
                watchedItem={watchedItem}
                guildLabels={guildLabels}
                missingGuildIds={missingGuildIds}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background p-6 text-sm text-muted-foreground">
          {t("settings.userNotifications.empty.watchedItems")}
        </div>
      )}
    </Card>
  );
};
