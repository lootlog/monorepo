import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationSettingsSkeleton = ({
  showActions = true,
}: {
  showActions?: boolean;
}) => (
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div className="space-y-4 lg:col-span-2">
      <Card className="border-border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </Card>
      <Card className="border-border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
    <div className="space-y-4">
      <Card className="border-border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </Card>
      {showActions && (
        <Card className="border-border bg-card p-4">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-8 rounded-md" />
        </Card>
      )}
    </div>
  </div>
);
