import { Skeleton } from "@lootlog/ui/components/skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";
import { MemberTileSkeleton } from "./member-tile-skeleton";

export const MembersSettingsSkeleton = () => (
  <SettingsTabSkeleton>
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      <Skeleton className="h-10 w-32 rounded-md" />
      <Skeleton className="h-8 w-45.5 rounded-lg max-sm:w-8" />
    </FilterBar>
    {Array.from({ length: 12 }, (_, index) => (
      <MemberTileSkeleton key={index} />
    ))}
  </SettingsTabSkeleton>
);
