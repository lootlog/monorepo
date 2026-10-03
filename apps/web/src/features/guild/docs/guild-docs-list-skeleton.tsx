import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { GuildDocsGridSkeleton } from "./guild-docs-grid-skeleton";

/** Route-level stand-in for the documents page: its toolbar above the cards. */
export const GuildDocsListSkeleton = () => {
  return (
    <div aria-busy="true" className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <FilterBar>
          <Skeleton className="h-10 min-w-0 flex-1 basis-full rounded-xl sm:basis-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </FilterBar>
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-3">
        <GuildDocsGridSkeleton />
      </div>
    </div>
  );
};
