import { FilterBar } from "@/components/common/filter-bar";
import { useViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import { getReservationCollectionClassName } from "./reservation-collection-layout";

/** Route-level stand-in for the reservations page: its filter bar above the spots. */
export const ReservationsPageSkeleton = () => {
  const { viewMode } = useViewMode("reservations-view-mode");

  return (
    <div aria-busy="true" className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <FilterBar>
          <Skeleton className="h-10 min-w-0 flex-1 basis-48 rounded-xl" />
          <Skeleton className="order-last h-10 basis-full rounded-xl xl:order-none xl:w-80 xl:basis-auto" />
          <Skeleton className="h-10 w-[4.5rem] rounded-xl" />
        </FilterBar>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <div className={getReservationCollectionClassName(viewMode)}>
          {Array.from({ length: 8 }).map((_, index) => (
            <ReservationCardSkeleton key={index} viewMode={viewMode} />
          ))}
        </div>
      </div>
    </div>
  );
};
