import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const UserNotificationsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 px-3 py-3">
        <PageHeaderSkeleton
          actions={<Skeleton className="size-10 rounded-md" />}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <SectionCardSkeleton withIcon>
              <SectionCardContent>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </SectionCardContent>
            </SectionCardSkeleton>
          </div>
          <div className="space-y-3">
            <SectionCardSkeleton withIcon withDescription={false}>
              <SectionCardContent>
                <div className="space-y-2">
                  <Skeleton className="h-9 rounded-xl" />
                  <Skeleton className="h-9 rounded-xl" />
                </div>
              </SectionCardContent>
            </SectionCardSkeleton>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
