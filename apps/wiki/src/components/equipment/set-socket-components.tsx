import { groupBy, sortBy, sumBy } from "es-toolkit";
import {
  findSymbol,
  fusionGoldCost,
  hasSocket,
  socketOptions,
} from "@lootlog/domain/item-socket";
import { formatNumber } from "@lootlog/domain/locale";
import { ArticleSection } from "@/components/article/article-section";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { SocketItem } from "@/components/sockets/socket-item";
import { useSocketItems } from "@/hooks/use-socket-items";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { formatGold } from "@/lib/upgrade-cost-format";
import { EmptyNotice } from "@/components/common/empty-notice";

const findChosenSymbol = (
  options: ReadonlyArray<{ bonus: string; symbolId: number }>,
  bonus: string | undefined,
) => {
  const symbolId = options.find((option) => option.bonus === bonus)?.symbolId;

  return symbolId === undefined ? undefined : findSymbol(symbolId);
};

export function SetSocketComponents() {
  const wornItems = useWornItems();
  const itemsById = useSocketItems();
  const symbolItems = [...itemsById.values()];

  const rows = [...wornItems].flatMap(([slotId, { item, dropped, upgrade }]) =>
    hasSocket(dropped)
      ? [
          {
            slotId,
            item,
            upgrade,
            symbol: findChosenSymbol(
              socketOptions(dropped, symbolItems),
              upgrade.symbol,
            ),
          },
        ]
      : [],
  );

  const symbols = rows.flatMap(({ symbol }) => (symbol ? [symbol] : []));

  const components = sortBy(
    Object.entries(
      groupBy(
        symbols.flatMap(({ recipe }) => recipe),
        ({ id }) => id,
      ),
    ).map(([id, needed]) => ({
      id: Number(id),
      count: sumBy(needed, ({ count }) => count),
    })),
    [({ id }) => id],
  );

  return (
    <ArticleSection
      id="set-page-socket-components"
      title={t("socket.set.title")}
      description={t("socket.set.description")}
    >
      {rows.length === 0 ? (
        <EmptyNotice>{t("socket.set.noSockets")}</EmptyNotice>
      ) : (
        <>
          {symbols.length === 0 ? (
            <EmptyNotice>{t("socket.set.none")}</EmptyNotice>
          ) : (
            <>
              <StatsTileGrid
                framed
                aria-live="polite"
                className="sm:grid-cols-3"
              >
                <StatsTile
                  label={t("socket.set.fusions")}
                  value={formatNumber(symbols.length)}
                />
                <StatsTile
                  label={t("socket.set.components")}
                  value={formatNumber(sumBy(components, ({ count }) => count))}
                />
                <StatsTile
                  label={t("socket.set.gold")}
                  value={formatGold(
                    sumBy(symbols, ({ tier }) => fusionGoldCost(tier)),
                  )}
                />
              </StatsTileGrid>
              <section
                aria-labelledby="set-socket-components-list"
                className="flex flex-col gap-3"
              >
                <h3
                  id="set-socket-components-list"
                  className="text-base font-semibold text-foreground"
                >
                  {t("socket.set.componentsList")}
                </h3>
                <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {components.map(({ id, count }) => (
                    <li key={id}>
                      <SocketItem
                        item={itemsById.get(id)}
                        detail={t("socket.count", { count })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          <ul
            aria-label={t("socket.set.items")}
            className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-card"
          >
            {rows.map(({ slotId, item, upgrade, symbol }) => (
              <li
                key={slotId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm"
              >
                <ItemNameLink item={item} upgrade={upgrade} highlight="" />
                {symbol ? (
                  <SocketItem
                    item={itemsById.get(symbol.tier.symbols[symbol.bonus])}
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {t("socket.set.emptySocket")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </ArticleSection>
  );
}
