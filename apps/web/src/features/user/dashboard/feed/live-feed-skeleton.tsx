import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";

export function LiveFeedSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t("common.loading")}>
      <div
        aria-hidden="true"
        className="motion-reduce:[&_[data-slot=skeleton]]:animate-none"
      >
        <div className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}>
          <Skeleton className="h-3 w-28" />
        </div>
        {Array.from({ length: 8 }, (_, index) => {
          const hasLoot = index % 3 === 1;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 py-3",
                LIST_TILE_INSET_CLASS,
                LIST_TILE_RULE_CLASS,
              )}
            >
              <Skeleton className="size-10 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className={cn("h-4", hasLoot ? "w-40" : "w-32")} />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
              {hasLoot && <Skeleton className="size-9 shrink-0" />}
              <Skeleton className="size-6 shrink-0 rounded-md" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
