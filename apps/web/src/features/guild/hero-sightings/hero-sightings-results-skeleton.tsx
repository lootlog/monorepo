import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

const SKELETON_ROWS = 8;

/** Stands in for the board: table rows, or tiles below `xl`. */
export const HeroSightingsResultsSkeleton = () => (
  <div aria-busy="true">
    <TableRowsSkeleton
      rows={SKELETON_ROWS}
      withHeader
      mobileList={Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <ListTileSkeleton key={index} media="none" actions={1} />
      ))}
    />
  </div>
);
