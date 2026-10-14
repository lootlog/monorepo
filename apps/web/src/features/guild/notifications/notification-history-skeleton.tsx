import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationTileSkeleton } from "./notification-tile-skeleton";

/** Route-level stand-in for the notification history: toolbar above the rows. */
export const NotificationHistorySkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <ListToolbarSkeleton>
      <div className="flex gap-1.5">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </ListToolbarSkeleton>
    {Array.from({ length: 8 }, (_, index) => (
      <NotificationTileSkeleton key={index} />
    ))}
  </div>
);
