import { BandSection } from "@/components/common/band-section";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

/** Route-level stand-in for the notifications page: its two banded sections. */
export const UserNotificationsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
      <BandSection
        id="user-notifications-dm-skeleton"
        title={t("settings.userNotifications.dm.sectionTitle")}
        tiled
      >
        <ListTileSkeleton
          className="py-1"
          trailing={
            <Skeleton className="h-8 w-40 shrink-0 rounded-lg max-sm:hidden" />
          }
        />
      </BandSection>
      <BandSection
        id="user-notifications-watched-items-skeleton"
        title={t("settings.userNotifications.watchList.title")}
        description={t("settings.userNotifications.description")}
        tiled
        trailing={
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        }
      >
        {Array.from({ length: 4 }, (_, index) => (
          <ListTileSkeleton key={index} actions={1} />
        ))}
      </BandSection>
    </div>
  );
};
