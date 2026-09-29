import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

export function LiveFeedSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t("common.loading")}>
      <div
        aria-hidden="true"
        className="relative py-1 before:absolute before:inset-y-0 before:left-[1.375rem] before:w-px before:bg-border/70 motion-reduce:[&_[data-slot=skeleton]]:animate-none"
      >
        <Skeleton className="mx-4 mt-3 mb-1 h-3 w-28" />
        {Array.from({ length: 6 }, (_, index) => {
          const hasLoot = index % 3 !== 1;

          return (
            <div
              key={index}
              className="grid grid-cols-[0.75rem_2.5rem_minmax(0,1fr)] gap-x-3 px-4 py-3"
            >
              <span className="flex justify-center pt-4">
                <Skeleton className="relative size-3 rounded-full ring-4 ring-card" />
              </span>
              <Skeleton className="size-10" />
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className={cn("h-4", hasLoot ? "w-40" : "w-32")} />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="ml-auto size-8 rounded-xl" />
                </div>
                {hasLoot && (
                  <div className="flex gap-1">
                    <Skeleton className="size-9" />
                    {index % 2 === 0 && <Skeleton className="size-9" />}
                  </div>
                )}
                <div className="flex gap-4">
                  <Skeleton className={cn("h-3", hasLoot ? "w-44" : "w-16")} />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
