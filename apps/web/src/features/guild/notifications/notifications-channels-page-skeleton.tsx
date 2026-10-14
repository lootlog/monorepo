import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationChannelRowsSkeleton } from "./notification-channel-rows-skeleton";
import { NotificationsTabSkeleton } from "./notifications-tab-skeleton";

/** Route-level stand-in for the channels tab. */
export const NotificationsChannelsPageSkeleton = () => (
  <NotificationsTabSkeleton
    actions={
      <>
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </>
    }
  >
    <NotificationChannelRowsSkeleton />
  </NotificationsTabSkeleton>
);
