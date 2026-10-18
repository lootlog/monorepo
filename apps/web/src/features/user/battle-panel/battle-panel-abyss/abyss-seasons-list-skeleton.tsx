import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

/** `AbyssSeasonsList` while the seasons load. */
export const AbyssSeasonsListSkeleton = () => (
  <TableRowsSkeleton
    rows={6}
    withHeader
    trailingColumns={6}
    rowContent="text"
    mobileList={Array.from({ length: 6 }, (_, index) => (
      <ListTileSkeleton key={index} media="none" />
    ))}
  />
);
