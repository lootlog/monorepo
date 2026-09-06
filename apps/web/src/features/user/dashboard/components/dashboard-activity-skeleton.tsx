import { useTranslation } from "react-i18next";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export function DashboardActivitySkeleton() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t("common.loading")}
      className="flex min-h-full flex-1 flex-col justify-center gap-4 overflow-hidden"
    >
      <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex justify-between gap-8">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-3 w-8 motion-reduce:animate-none"
            />
          ))}
        </div>
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1 auto-cols-[var(--activity-cell,20px)]">
          {Array.from({ length: 112 }, (_, index) => (
            <Skeleton
              key={index}
              className="size-[var(--activity-cell,20px)] rounded-sm motion-reduce:animate-none"
            />
          ))}
        </div>
        <Skeleton className="h-3 w-3/4 motion-reduce:animate-none" />
        <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
