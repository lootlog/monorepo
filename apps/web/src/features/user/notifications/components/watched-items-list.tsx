import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { SectionCard } from "@/components/common/section-card/section-card";
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
    <SectionCard>
      <SectionCardHeader
        icon={BellRing}
        title={t("settings.userNotifications.watchList.title")}
        description={t("settings.userNotifications.watchList.description")}
        actions={
          <Badge variant="secondary" className="ml-auto">
            {t("settings.userNotifications.watchLimitStatus", {
              count: watchedItemsCount,
              limit: USER_WATCHED_ITEMS_LIMIT,
            })}
          </Badge>
        }
      />
      <SectionCardContent>
        {watchedItemsCount > 0 ? (
          <div className="flex flex-col gap-3">
            {watchedItems.map((watchedItem) => {
              const selectedGuildIdsForItem = getWatchedItemGuildIds(
                watchedItem.notificationRule?.filters ?? null,
              );
              const guildLabels = selectedGuildIdsForItem
                .map(
                  (guildId) =>
                    guilds.find((guild) => guild.id === guildId)?.name,
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
          <div className="p-6 text-sm text-muted-foreground">
            {t("settings.userNotifications.empty.watchedItems")}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
};
