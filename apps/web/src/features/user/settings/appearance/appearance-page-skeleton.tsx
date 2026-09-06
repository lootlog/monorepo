import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const AppearanceSettingsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-4 px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        ></PageHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SectionCard key={i}>
              <SectionCardHeader
                title={<Skeleton className="mb-3 h-24 w-full rounded-lg" />}
              />
              <SectionCardContent>
                <Skeleton className="mb-1 h-4 w-24" />
                <Skeleton className="mb-2 h-3 w-36" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </SectionCardContent>
            </SectionCard>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
