import { NotificationFormSkeleton } from "./notification-form-skeleton";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationCreateSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </Card>

        <NotificationFormSkeleton />
      </div>
    </div>
  );
};
