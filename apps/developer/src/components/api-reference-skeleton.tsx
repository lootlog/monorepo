import { Skeleton } from "@lootlog/ui/components/skeleton";
import { portalText as t } from "@/lib/translations";

export function ApiReferenceSkeleton() {
  return (
    <div
      role="status"
      className="grid min-h-[calc(100dvh-var(--portal-header-height))] md:grid-cols-[17rem_minmax(0,1fr)]"
    >
      <span className="sr-only">{t.loading}</span>
      <div className="hidden flex-col gap-3 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-full rounded-lg" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-3/4" />
        ))}
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-12">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
        <Skeleton className="mt-6 h-48 w-full max-w-3xl rounded-xl" />
      </div>
    </div>
  );
}
