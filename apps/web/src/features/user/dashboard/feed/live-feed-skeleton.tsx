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
            // The same grid as LiveFeedEventRow: below @lg the loot wraps
            // under the title, so a skeleton row is as tall as a loaded one.
            <div
              key={index}
              className={cn(
                "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 @lg:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto]",
                LIST_TILE_INSET_CLASS,
                LIST_TILE_RULE_CLASS,
              )}
            >
              <Skeleton className="size-10" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className={cn("h-4", hasLoot ? "w-40" : "w-32")} />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
              {hasLoot && (
                <Skeleton className="col-span-2 col-start-2 row-start-2 size-9 @lg:col-span-1 @lg:col-start-3 @lg:row-start-1 @lg:justify-self-end" />
              )}
              <Skeleton className="col-start-3 row-start-1 size-6 rounded-md @lg:col-start-4" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
