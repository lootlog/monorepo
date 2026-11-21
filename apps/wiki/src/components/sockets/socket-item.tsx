import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { ItemNameLink } from "@/components/catalog/item-name-link";

type SocketItemProps = {
  item: CatalogItemDtoOutput | undefined;
  /** A figure beside the name, such as how many are needed or a chance. */
  detail?: string;
};

/**
 * A component, symbol or chest: its tile, its name and a figure about it,
 * such as how many are needed.
 */
export function SocketItem({ item, detail }: SocketItemProps) {
  if (!item) {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-10 shrink-0 rounded-md" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0">
        <CatalogItemTile item={item} />
      </span>
      <ItemNameLink item={item} highlight="" />
      {detail === undefined ? null : (
        <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
          {detail}
        </span>
      )}
    </div>
  );
}
