import { ChartSection } from "@/components/common/chart-section";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/**
 * The kill trend while its data or chart chunk loads: the real heading, a
 * slot as large as the chart/table toggle and the chart's 256px body.
 */
export function KillAnalyticsTrendSkeleton({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <ChartSection
      title={title}
      description={description}
      actions=<Skeleton className="h-8 w-[131px] rounded-lg" />
      isLoading
    >
      {null}
    </ChartSection>
  );
}
