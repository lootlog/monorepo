import { Crown } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { cn } from "cn";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";
import { compareItemStats } from "@/lib/item-comparison";
import { type ItemUpgrade, upgradeItemStat } from "@/lib/item-upgrade";
import { ComparedItemHeader } from "./compared-item-header";

type ItemComparisonTableProps = {
  items: ReadonlyArray<{ item: CatalogItemDtoOutput; upgrade: ItemUpgrade }>;
};

/**
 * The compared items in columns and their stats in rows, each item at its
 * upgrade. Columns share the width, so the table never scrolls sideways.
 */
export function ItemComparisonTable({ items }: ItemComparisonTableProps) {
  const rows = compareItemStats(
    items.map(({ item, upgrade }) => upgradeItemStat(item, upgrade)),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <Table className="table-fixed">
        <caption className="sr-only">{t("comparison.statsTitle")}</caption>
        <TableHeader className="bg-sidebar">
          <TableRow className="hover:bg-transparent">
            {items.map(({ item, upgrade }) => (
              <TableHead
                key={item.id}
                scope="col"
                className="h-auto px-2 py-3 align-top whitespace-normal text-foreground sm:px-3"
              >
                <ComparedItemHeader item={item} upgrade={upgrade} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {row.values.map((value, index) => {
                const isBest = row.best[index] ?? false;

                return (
                  <TableCell
                    key={items[index]?.item.id ?? index}
                    className={cn(
                      "h-auto px-2 py-2 align-top text-xs whitespace-normal [overflow-wrap:anywhere] sm:px-3 sm:text-sm",
                      isBest && "bg-signal-ready/8 font-medium",
                    )}
                  >
                    {value ? (
                      <span className="flex items-start gap-1.5">
                        <span className="min-w-0">{renderItemStat(value)}</span>
                        {isBest ? (
                          <>
                            <Crown
                              aria-hidden="true"
                              className="mt-0.5 size-3.5 shrink-0 text-signal-ready"
                            />
                            <span className="sr-only">
                              {t("comparison.best")}
                            </span>
                          </>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">
                          {t("comparison.missing")}
                        </span>
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
