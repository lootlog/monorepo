import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { t } from "@/i18n/messages";
import {
  countRevisionChanges,
  formatRevisionDays,
} from "@/lib/item-revision-changes";

/**
 * An item the game changed, as a row of the catalog's lists: its name over
 * when Lootlog saw its latest change and how much that change altered.
 */
export function ItemChangeCard({ item }: { item: CatalogItemDtoOutput }) {
  const latest = item.revisions.at(-1);

  if (!latest) return null;

  return (
    <article className="flex h-full min-w-0 items-center gap-2.5 rounded-md border border-border/50 bg-card px-2.5 py-2 transition-colors duration-150 hover:border-border hover:bg-accent/30 motion-reduce:transition-none">
      <CatalogItemTile item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ItemNameLink item={item} highlight="" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <time dateTime={latest.changedBy} className="tabular-nums">
            {formatRevisionDays(latest)}
          </time>
          <span className="tabular-nums">
            {t("revisions.changeCount", {
              count: countRevisionChanges(latest),
            })}
          </span>
        </div>
      </div>
    </article>
  );
}
