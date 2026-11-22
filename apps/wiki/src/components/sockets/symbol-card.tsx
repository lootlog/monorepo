import {
  type SocketBonus,
  symbolRecipe,
  type SymbolTier,
} from "@lootlog/domain/item-socket";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { SocketItem } from "./socket-item";

type SymbolCardProps = { tier: SymbolTier; bonus: SocketBonus };

export function SymbolCard({ tier, bonus }: SymbolCardProps) {
  const itemsById = useSocketItems();
  const symbolId = tier.symbols[bonus];

  return (
    <article className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <SocketItem item={itemsById.get(symbolId)} />
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">
            {t("socket.page.components")}
          </dt>
          <dd>
            <ul className="flex flex-wrap items-center gap-3">
              {symbolRecipe(tier, bonus).map(({ id, count }) => {
                const component = itemsById.get(id);

                return (
                  <li key={id} className="flex items-center gap-1.5">
                    {component ? (
                      <CatalogItemTile item={component} />
                    ) : (
                      <Skeleton className="size-10 rounded-md" />
                    )}
                    <span className="font-semibold text-foreground tabular-nums">
                      {t("socket.count", { count })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
      </dl>
    </article>
  );
}
