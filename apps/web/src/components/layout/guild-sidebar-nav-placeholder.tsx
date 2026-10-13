import { Separator } from "@lootlog/ui/components/separator";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const leadingRows = [1, 2, 3, 4, 5, 6];

const trailingRows = [1, 2];

// Mirrors SidebarNav: the same header, gaps and 36px rows, with the divider
// above the activity items, so the loaded navigation lands in place.
export const GuildSidebarNavPlaceholder = () => {
  return (
    <div className="flex h-full w-full flex-1 flex-col gap-1.5 overflow-hidden bg-sidebar">
      <div className="mb-2 flex h-14 min-h-14 items-center border-b px-2">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        {leadingRows.map((i) => (
          <Skeleton key={i} className="mx-2 h-9 rounded-xl" />
        ))}
        <Separator />
        {trailingRows.map((i) => (
          <Skeleton key={i} className="mx-2 h-9 rounded-xl" />
        ))}
      </div>
    </div>
  );
};
