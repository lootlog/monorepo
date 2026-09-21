import { NotificationHistoryRowsSkeleton } from "./notification-history-rows-skeleton";
import { NotificationPageHeaderSkeleton } from "./notification-page-header-skeleton";

export const NotificationHistorySkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-3 py-3">
        <NotificationPageHeaderSkeleton />

        <NotificationHistoryRowsSkeleton />
      </div>
    </div>
  );
};
