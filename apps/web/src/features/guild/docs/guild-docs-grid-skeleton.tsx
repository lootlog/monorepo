import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors the document cards: title and version, editor, date and actions. */
export const GuildDocsGridSkeleton = () => {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <SectionCard key={index} className="gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
            <div className="mt-1 flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              <Skeleton className="size-9 shrink-0 rounded-xl" />
            </div>
          </SectionCard>
        ))}
      </div>
    </ScrollArea>
  );
};
