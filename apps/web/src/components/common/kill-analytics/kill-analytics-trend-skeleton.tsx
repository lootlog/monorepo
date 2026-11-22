import { ChartSection } from "@/components/common/chart-section";
import { Skeleton } from "@lootlog/ui/components/skeleton";

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
