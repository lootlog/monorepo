import { Link, type LinkOptions } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
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
 * A boss or an event with its newest items: the header opens its page and
 * every item opens its own.
 */
export function NewItemsCard({
  title,
  eyebrow,
  media,
  link,
  items,
  itemCount,
}: NewItemsCardProps) {
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
        aria-label={t("home.itemsOf", { name: title })}
        className="flex flex-1 flex-wrap content-start gap-2 border-t border-border/50 bg-background/30 px-4 py-3"
      >
        {items.slice(0, ITEMS_SHOWN).map((item) => (
          <li key={item.id}>
            <CatalogItemTile item={item} />
          </li>
        ))}
        {itemCount > ITEMS_SHOWN ? (
          <li className="flex h-9 items-center px-1 text-xs text-muted-foreground tabular-nums">
            {t("home.moreItems", { count: itemCount - ITEMS_SHOWN })}
          </li>
        ) : null}
      </ul>
    </article>
  );
}
