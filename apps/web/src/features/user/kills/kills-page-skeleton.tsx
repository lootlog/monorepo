import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const KillsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-4 px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        >
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </PageHeader>

        <SectionCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
          <SectionCardContent className="flex min-h-0 flex-1 flex-col p-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex h-14 items-center gap-4 border-b border-border px-4"
              >
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
            <SectionCardFooter className="shrink-0 justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </SectionCardFooter>
          </SectionCardContent>
        </SectionCard>
      </div>
    </ScrollArea>
  );
};
