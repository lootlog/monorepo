import { Skeleton } from "@lootlog/ui/components/skeleton";

const PILL_WIDTHS = [
  ["w-16", "w-16", "w-18", "w-28", "w-20", "w-18", "w-16", "w-16"],
  ["w-24", "w-20", "w-20", "w-20", "w-20", "w-14", "w-14", "w-24"],
  [],
] as const;

/** Mirrors the docked filters panel: header, quick filters, three sections. */
export const LootsFiltersSidebarSkeleton = () => (
  <div aria-hidden="true" className="flex h-full w-[340px] shrink-0 flex-col">
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border pr-2 pl-4">
      <Skeleton className="size-5 rounded-sm" />
      <Skeleton className="h-4 w-14" />
      <Skeleton className="ml-auto size-8 rounded-lg" />
    </div>

    <div className="border-b border-sidebar-border">
      <div className="flex h-11 items-center gap-2 pr-2 pl-4">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pt-1 pb-4">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>

    {PILL_WIDTHS.map((pills, sectionIndex) => (
      <div key={sectionIndex} className="border-b border-sidebar-border">
        <div className="flex h-11 items-center gap-2 pr-2 pl-4">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4 px-4 pt-1 pb-5">
          {pills.length > 0 && (
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="flex flex-wrap gap-1.5">
                {pills.map((width, pillIndex) => (
                  <Skeleton
                    key={pillIndex}
                    className={`h-8 rounded-lg ${width}`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
