import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <PageHeaderSkeleton
      withIcon={false}
      withMetadata
      status={<Skeleton className="size-10 shrink-0 rounded-xl" />}
    />
    <div className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={4} withHeader />
        </SectionCardSkeleton>
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={4} withHeader />
        </SectionCardSkeleton>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <SectionCardSkeleton withIcon withDescription={false}>
          <TableRowsSkeleton rows={3} withHeader />
        </SectionCardSkeleton>
      </div>
    </div>
  </div>
);
