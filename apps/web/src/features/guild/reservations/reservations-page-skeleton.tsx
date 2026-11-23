import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { useViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import {
  getReservationCollectionClassName,
  RESERVATIONS_GRID_MEDIA_QUERY,
  RESERVATIONS_VIEW_MODE_KEY,
} from "./reservation-collection-layout";

export const ReservationsPageSkeleton = () => {
  const { viewMode, canChooseViewMode } = useViewMode(
    RESERVATIONS_VIEW_MODE_KEY,
    "grid",
    RESERVATIONS_GRID_MEDIA_QUERY,
    "grid",
  );

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
      <FilterBar search={<InlineSearchFieldSkeleton />}>
        <Skeleton className="h-10 w-32 rounded-md" />
        {canChooseViewMode && <Skeleton className="h-8 w-16 rounded-lg" />}
      </FilterBar>
      <div className={getReservationCollectionClassName(viewMode)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <ReservationCardSkeleton key={index} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};
