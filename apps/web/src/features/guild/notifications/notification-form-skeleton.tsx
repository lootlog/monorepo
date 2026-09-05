import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationFormSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div className="lg:col-span-2">
      <Card className="border-border bg-card p-4">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
    <div className="hidden lg:block">
      <Card className="border-border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </Card>
    </div>
  </div>
);
