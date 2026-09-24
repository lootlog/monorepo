import { Skeleton } from "@lootlog/ui/components/skeleton";

const CHECKBOX_ROWS = [4, 6, 0] as const;

const SECTION_TITLE_WIDTHS = ["w-32", "w-36", "w-28"] as const;

/** Mirrors the filters side panel: quick filters and three sections. */
export const LootsFiltersSidebarSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex h-full w-[340px] shrink-0 flex-col bg-background py-3 pr-3"
  >
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-filters-sidebar">
      <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
        <div className="flex min-h-7 items-center">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-7 w-36 rounded-xl" />
          <Skeleton className="h-7 w-28 rounded-xl" />
          <Skeleton className="h-7 w-28 rounded-xl" />
        </div>
      </div>

      {CHECKBOX_ROWS.map((rows, sectionIndex) => (
        <div
          key={sectionIndex}
          className="border-b border-border/70 px-3 last:border-b-0 sm:px-4"
        >
          <div className="flex min-h-11 items-center justify-between">
            <Skeleton className={`h-4 ${SECTION_TITLE_WIDTHS[sectionIndex]}`} />
            <Skeleton className="size-4 rounded-sm" />
          </div>
          <div className="space-y-4 border-t border-border/70 pb-4 pt-3">
            {rows > 0 && (
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {Array.from({ length: rows }, (_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex min-h-8 items-center gap-2"
                    >
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
