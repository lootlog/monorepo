import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <PageHeaderSkeleton withDescription={false} withMetadata>
      <SectionCardFooter className="grid gap-1 p-1.5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </SectionCardFooter>
    </PageHeaderSkeleton>

    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <div className="min-w-0 space-y-3">
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={4} withHeader />
        </SectionCardSkeleton>
        <SectionCardSkeleton withIcon withDescription={false}>
          <Skeleton className="m-3 h-40 rounded-lg" />
        </SectionCardSkeleton>
      </div>
      <div className="min-w-0 space-y-3">
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
