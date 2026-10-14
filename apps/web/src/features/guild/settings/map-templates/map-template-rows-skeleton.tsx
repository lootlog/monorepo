import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";

/** Stands in for the map template tiles: name, map count, edit and delete. */
export const MapTemplateRowsSkeleton = () => (
  <div aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => (
      <ListTileSkeleton key={index} actions={2} />
    ))}
  </div>
);
