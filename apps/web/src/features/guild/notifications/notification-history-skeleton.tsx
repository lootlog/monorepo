import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationTileSkeleton } from "./notification-tile-skeleton";
import { NotificationsTabSkeleton } from "./notifications-tab-skeleton";

export const NotificationHistorySkeleton = () => (
  <NotificationsTabSkeleton
    actions={
      <>
        <Skeleton className="h-10 w-36 rounded-md" />
      </>
    }
  >
    {Array.from({ length: 8 }, (_, index) => (
      <NotificationTileSkeleton key={index} />
    ))}
  </NotificationsTabSkeleton>
);
