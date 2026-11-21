import {
  chestComponents,
  type ComponentChest,
} from "@lootlog/domain/item-socket";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { formatChestChance } from "@/lib/chest-chance";
import { SocketItem } from "./socket-item";

/** One chest of components: the chest and each component's chance from it. */
export function ChestCard({ chest }: { chest: ComponentChest }) {
  const itemsById = useSocketItems();

  return (
    <article className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <SocketItem item={itemsById.get(chest.id)} />
      <ul
        aria-label={t("socket.chests.contents")}
        className="flex flex-wrap items-center gap-3"
      >
        {chestComponents(chest).map(({ id, chance }) => {
          const component = itemsById.get(id);

          return (
            <li key={id} className="flex items-center gap-1.5">
              {component ? (
                <CatalogItemTile item={component} />
              ) : (
                <Skeleton className="size-10 rounded-md" />
              )}
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatChestChance(chest, chance)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
