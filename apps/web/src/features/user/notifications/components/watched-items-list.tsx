import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { BellRing, Package, Plus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@/components/common/empty-state";
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
  /** Watching needs active direct messages; the empty state offers the first watch only then. */
  canAddWatch: boolean;
  onAddWatch: () => void;
};

export const WatchedItemsList = ({
  watchedItems,
  guilds,
  canAddWatch,
  onAddWatch,
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
      <SectionCardContent className={watchedItemsCount > 0 ? undefined : "p-0"}>
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
          <EmptyState
            icon={Package}
            title={t("settings.userNotifications.empty.watchedItems")}
            description={t(
              canAddWatch
                ? "settings.userNotifications.empty.watchedItemsDescription"
                : "settings.userNotifications.dm.requiredHint",
            )}
            action={
              canAddWatch && (
                <Button onClick={onAddWatch}>
                  <Plus data-icon="inline-start" aria-hidden />
                  {t("settings.userNotifications.actions.addWatch")}
                </Button>
              )
            }
          />
        )}
      </SectionCardContent>
    </SectionCard>
  );
};
