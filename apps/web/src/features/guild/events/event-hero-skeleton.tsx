import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventHeroSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <PageHeaderSkeleton
      withIcon={false}
      withMetadata
      status={<Skeleton className="size-10 shrink-0 rounded-xl" />}
    />

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SectionCardSkeleton withIcon withDescription={false}>
          <div className="divide-y divide-border/70">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-none" />
            ))}
          </div>
        </SectionCardSkeleton>
      </div>
      <div className="space-y-3">
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={5} withHeader />
        </SectionCardSkeleton>
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={5} withHeader />
        </SectionCardSkeleton>
      </div>
    </div>
  </div>
);
