import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const TimersPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-56 max-w-full" />}
        />

        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
