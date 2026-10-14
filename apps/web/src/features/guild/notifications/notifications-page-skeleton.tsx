import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationRuleGroupsSkeleton } from "./notification-rule-groups-skeleton";
import { NotificationsTabSkeleton } from "./notifications-tab-skeleton";

/** Route-level stand-in for the rules tab. */
export const NotificationsPageSkeleton = () => (
  <NotificationsTabSkeleton
    actions={
      <>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </>
    }
  >
    <NotificationRuleGroupsSkeleton />
  </NotificationsTabSkeleton>
);
