import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const AccountSettingsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-4 px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        ></PageHeader>

        <SectionCard>
          <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
          <SectionCardContent>
            <Skeleton className="h-8 w-32 rounded-md" />
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
          <SectionCardContent>
            <Skeleton className="h-8 w-32 rounded-md" />
          </SectionCardContent>
        </SectionCard>
      </div>
    </ScrollArea>
  );
};
