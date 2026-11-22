import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const MemberTileSkeleton = () => (
  <ListTileSkeleton
    actions={1}
    trailing=<Skeleton className="h-6 w-24 shrink-0 rounded-full" />
  />
);
