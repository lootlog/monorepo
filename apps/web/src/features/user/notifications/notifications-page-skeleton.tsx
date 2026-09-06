import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const UserNotificationsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        ></PageHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard>
              <SectionCardHeader
                title={<Skeleton className="mb-3 h-5 w-40" />}
              />
              <SectionCardContent>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </SectionCardContent>
            </SectionCard>
          </div>
          <div className="space-y-4">
            <SectionCard>
              <SectionCardHeader
                title={<Skeleton className="mb-3 h-5 w-32" />}
              />
              <SectionCardContent>
                <div className="space-y-2">
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
              </SectionCardContent>
            </SectionCard>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
