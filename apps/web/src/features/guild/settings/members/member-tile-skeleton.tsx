import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors `MemberTile`: avatar, name over meta, access badge and menu. */
export const MemberTileSkeleton = () => (
  <ListTileSkeleton
    actions={1}
    trailing=<Skeleton className="h-6 w-24 shrink-0 rounded-full" />
  />
);
