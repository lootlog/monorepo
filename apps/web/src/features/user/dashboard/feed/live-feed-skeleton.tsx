import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

export function LiveFeedSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t("common.loading")}>
      <div
        aria-hidden="true"
        className="motion-reduce:[&_[data-slot=skeleton]]:animate-none"
      >
        {Array.from({ length: 8 }, (_, index) => {
          const hasLoot = index % 3 === 0;
          return (
            <div
              key={index}
              className="border-t border-border/50 first:border-t-0 odd:bg-card even:bg-muted/60 pb-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Skeleton className="size-8 shrink-0" />
                  <Skeleton className={cn("h-4", hasLoot ? "w-32" : "w-28")} />
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  {Array.from({ length: hasLoot ? 3 : 4 }, (_, avatar) => (
                    <Skeleton key={avatar} className="size-8 rounded-xl" />
                  ))}
                </div>
              </div>
              {hasLoot && (
                <div className="flex gap-1 border-t border-border/30 px-4 pt-2 pb-1">
                  <Skeleton className="size-8" />
                  {index % 2 === 0 && <Skeleton className="size-8" />}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/30 px-4 py-1">
                <Skeleton className={cn("h-4", hasLoot ? "w-44" : "w-16")} />
                <div className="flex h-6 items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-6" />
                  {hasLoot && <Skeleton className="h-3 w-6" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
