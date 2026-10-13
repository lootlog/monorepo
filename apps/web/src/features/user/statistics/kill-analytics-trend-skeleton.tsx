import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/**
 * The kill trend card while its data or chart chunk loads: the real header, a
 * slot as large as the chart/table toggle and the chart's 256px body.
 */
export function KillAnalyticsTrendSkeleton({ title }: { title: string }) {
  return (
    <SectionCard>
      <SectionCardHeader
        title={title}
        actions=<Skeleton className="h-8 w-[131px] rounded-lg" />
      />
      <SectionCardContent>
        <Skeleton className="h-64 w-full" />
      </SectionCardContent>
    </SectionCard>
  );
}
