import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";

export const MapTemplateRowsSkeleton = () => (
  <div aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => (
      <ListTileSkeleton key={index} actions={2} />
    ))}
  </div>
);
