import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GuildDocEditorSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          <PageHeader
            title={<Skeleton className="h-5 w-40" />}
            description={<Skeleton className="h-3 w-56 max-w-full" />}
          />
          <SectionCard className=" border-border bg-card ">
            <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
            <SectionCardContent>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[460px] w-full" />
            </SectionCardContent>
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
