import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import { useViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import {
  getReservationCollectionClassName,
  RESERVATIONS_VIEW_MODE_KEY,
} from "./reservation-collection-layout";

/** Route-level stand-in for the reservations page: its toolbar above the spots. */
export const ReservationsPageSkeleton = () => {
  const { viewMode } = useViewMode(RESERVATIONS_VIEW_MODE_KEY);

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
      <ListToolbarSkeleton>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </ListToolbarSkeleton>
      <div className={getReservationCollectionClassName(viewMode)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <ReservationCardSkeleton key={index} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};
