import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationTileSkeleton } from "./notification-tile-skeleton";
import { NotificationsTabSkeleton } from "./notifications-tab-skeleton";

/** Route-level stand-in for the history tab. */
export const NotificationHistorySkeleton = () => (
  <NotificationsTabSkeleton
    actions={
      <>
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </>
    }
  >
    {Array.from({ length: 8 }, (_, index) => (
      <NotificationTileSkeleton key={index} />
    ))}
  </NotificationsTabSkeleton>
);
