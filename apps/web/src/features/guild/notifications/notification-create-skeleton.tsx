import { NotificationFormSkeleton } from "./notification-form-skeleton";
import { NotificationPageHeaderSkeleton } from "./notification-page-header-skeleton";

export const NotificationCreateSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-3 py-3">
        <NotificationPageHeaderSkeleton />

        <NotificationFormSkeleton />
      </div>
    </div>
  );
};
