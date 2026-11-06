import { Link, type LinkOptions } from "@tanstack/react-router";
import { sortBy } from "es-toolkit";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  ITEM_RARITIES_BY_VALUE,
  resolveItemRarity,
} from "@lootlog/ui/lib/item-rarity";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { useGridColumnCount } from "@/hooks/use-grid-column-count";
import { t } from "@/i18n/messages";

type NewItemsCardProps = {
  title: string;
  /** What the card is about, above its title, such as a boss's kind. */
  eyebrow?: string;
  /** The picture of what the items belong to, before the title. */
  media: ReactNode;
  /** The page of what the items belong to, which the header opens. */
  link: LinkOptions;
  items: readonly CatalogItemDtoOutput[];
  /** How many items it has in all; the card shows the first few. */
  itemCount: number;
};

const ITEMS_SHOWN = 12;

/**
 * How many tiles fill whole rows of `columnCount` columns, as close to the
 * first few items and the count tile as whole rows allow.
 */
const slotCount = (columnCount: number | null) =>
  columnCount === null
    ? ITEMS_SHOWN + 1
    : Math.max(1, Math.round((ITEMS_SHOWN + 1) / columnCount)) * columnCount;

const rarityRank = ({ rarity }: CatalogItemDtoOutput) =>
  ITEM_RARITIES_BY_VALUE.indexOf(resolveItemRarity(rarity));

/**
 * A boss or an event with its newest items, the most valuable first: the
 * header opens its page and every item opens its own. Items past the first
 * few are counted in a tile that opens the page too, in the last place of
 * the last row, so it never wraps onto a row of its own.
 */
export function NewItemsCard({
  title,
  eyebrow,
  media,
  link,
  items,
  itemCount,
}: NewItemsCardProps) {
  const { ref: gridRef, columnCount } = useGridColumnCount();
  const slots = slotCount(columnCount);
  const shownCount = itemCount > slots ? slots - 1 : itemCount;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
      <Link
        {...link}
        className="group/card flex items-center gap-4 p-3 pr-4 outline-none transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none"
      >
        {media}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {eyebrow ? (
            <span className="truncate text-xs font-medium text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
          <span className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("home.itemCount", { count: itemCount })}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-150 group-hover/card:translate-x-0.5 group-hover/card:text-foreground motion-reduce:transition-none"
        />
      </Link>
      <ul
        ref={gridRef}
        aria-label={t("home.itemsOf", { name: title })}
        className="grid flex-1 grid-cols-[repeat(auto-fill,2.25rem)] content-start gap-2 border-t border-border/50 bg-background/30 px-4 py-3"
      >
        {sortBy(items, [rarityRank])
          .slice(0, shownCount)
          .map((item) => (
            <li key={item.id}>
              <CatalogItemTile item={item} />
            </li>
          ))}
        {itemCount > shownCount ? (
          <li>
            <Link
              {...link}
              aria-label={t("home.allItemsOf", { name: title })}
              className="grid size-9 place-items-center rounded-lg border-2 border-border bg-muted/30 text-xs font-medium text-muted-foreground tabular-nums outline-none transition-[color,border-color] duration-150 hover:border-primary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {t("home.moreItems", { count: itemCount - shownCount })}
            </Link>
          </li>
        ) : null}
      </ul>
    </article>
  );
}
