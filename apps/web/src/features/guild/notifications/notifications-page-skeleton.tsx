import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationSettingsSkeleton } from "./notification-settings-skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";

export const NotificationsPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-3 py-3">
        <PageHeaderSkeleton
          actions={<Skeleton className="size-10 rounded-md" />}
        />

        <NotificationSettingsSkeleton />
      </div>
    </div>
  );
};
