import { Skeleton } from "@lootlog/ui/components/skeleton";

export const MapTemplateRowsSkeleton = () => (
  <div className="divide-y divide-border">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="flex h-14 items-center gap-3 px-3">
        <Skeleton className="size-4 rounded" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="size-8 rounded-xl" />
        <Skeleton className="size-8 rounded-xl" />
      </div>
    ))}
  </div>
);
