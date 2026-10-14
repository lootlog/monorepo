import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { GuildDocTileSkeleton } from "./guild-doc-tile-skeleton";

/** Route-level stand-in for the documents page: its toolbar above the tiles. */
export const GuildDocsListSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <ListToolbarSkeleton>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </ListToolbarSkeleton>
    {Array.from({ length: 6 }).map((_, index) => (
      <GuildDocTileSkeleton key={index} hasActions={false} />
    ))}
  </div>
);
