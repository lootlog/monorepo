import { SkeletonLine } from "@/components/common/skeleton-line";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

// Mirrors `ThemeCard`: preview image, three color swatches, title and description.
export const AppearanceSettingsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4"
            >
              <Skeleton className="mb-1 h-32 w-full rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="size-10 rounded-md" />
              </div>
              <div>
                <div className="text-sm">
                  <SkeletonLine className="h-3.5 w-24" />
                </div>
                <div className="text-xs">
                  <SkeletonLine className="h-3 w-40 max-w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
