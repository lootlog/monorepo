import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";

const leadingRows = [1, 2, 3, 4, 5, 6];

const trailingRows = [1, 2];

const renderRows = (rows: number[]) => (
  <ul className="flex flex-col gap-1.5">
    {rows.map((i) => (
      <li key={i} className="list-none px-2">
        <Skeleton className="h-9 rounded-lg" />
      </li>
    ))}
  </ul>
);

// Mirrors SidebarNav: the same header, 36px rows and labelled management
// group, so the loaded navigation lands in place.
export const GuildSidebarNavPlaceholder = () => {
  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-sidebar">
      <div className="flex h-14 min-h-14 items-center border-b border-sidebar-border px-2">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="pt-3.5">
        {renderRows(leadingRows)}
        <div className="flex items-center gap-2.5 pt-5 pr-2 pb-2 pl-5 text-[11px]">
          <SkeletonLine className="h-2 w-20" />
          <span className="h-px flex-1 bg-sidebar-border" />
        </div>
        {renderRows(trailingRows)}
      </div>
    </div>
  );
};
