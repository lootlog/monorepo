import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

export const PageSkeleton = () => (
  <ScrollArea data-under-top-bar aria-busy="true" className="h-full min-h-0">
    <FilterBar search={<InlineSearchFieldSkeleton />} />
    <CardListSkeleton card={<ListTileSkeleton />} />
  </ScrollArea>
);
