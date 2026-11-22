import { ResultsSurface } from "@/components/common/results-surface";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { AbyssSeasonsListSkeleton } from "./abyss-seasons-list-skeleton";

export const AbyssSeasonsPageSkeleton = () => (
  <div aria-busy="true" className="min-w-0">
    <ResultsSurface
      search={<Skeleton aria-hidden="true" className="h-10 w-55 rounded-lg" />}
    >
      <AbyssSeasonsListSkeleton />
    </ResultsSurface>
  </div>
);
