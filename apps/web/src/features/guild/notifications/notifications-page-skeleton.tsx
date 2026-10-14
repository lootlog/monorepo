import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationSettingsSkeleton } from "./notification-settings-skeleton";

/** Route-level stand-in for the notifications page: its toolbar above the sections. */
export const NotificationsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <ListToolbarSkeleton>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </ListToolbarSkeleton>
    <NotificationSettingsSkeleton />
  </div>
);
