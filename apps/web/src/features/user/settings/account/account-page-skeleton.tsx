import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const AccountSettingsPageSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 px-3 pb-3">
        <SectionCard>
          <SectionCardHeader
            title=<Skeleton render={<span />} className="block h-4 w-32" />
          />
          <SectionCardContent>
            <Skeleton className="h-8 w-32 rounded-md" />
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardHeader
            title=<Skeleton render={<span />} className="block h-4 w-32" />
          />
          <SectionCardContent>
            <Skeleton className="h-8 w-32 rounded-md" />
          </SectionCardContent>
        </SectionCard>
      </div>
    </ScrollArea>
  );
};
