import { Link } from "@tanstack/react-router";
import {
  type CatalogItemDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ArticleSection } from "@/components/article/article-section";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { ItemNameLink } from "@/components/catalog/item-name-link";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import {
  relatedDropsQuery,
  relatedDropsSource,
} from "@/lib/catalog-page-queries";

/** The other items of the monster the item drops from, as a gallery. */
export function ItemRelatedDrops({ item }: { item: CatalogItemDtoOutput }) {
  const source = relatedDropsSource(item);

  const { data } = useCatalogControllerGetItems(
    relatedDropsQuery(source?.key ?? ""),
    { query: { enabled: source !== undefined } },
  );

  if (!source) return null;

  const related = data?.hits.filter(({ id }) => id !== item.id).slice(0, 12);

  if (related?.length === 0) return null;

  return (
    <ArticleSection
      id="item-related-drops"
      title={t("item.relatedTitle", { name: source.name })}
      description={t("item.relatedDescription")}
      action={
        <ChevronLink
          render={<Link to="/npcs/$npcSlug" params={npcPageParams(source)} />}
        >
          {t("item.relatedAll")}
        </ChevronLink>
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),1fr))] gap-2">
        {related
          ? related.map((drop) => (
              <li
                key={drop.id}
                className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/50 bg-card px-2.5 py-2"
              >
                <CatalogItemTile item={drop} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <ItemNameLink item={drop} highlight="" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("common.levelShort", { level: drop.lvl })}
                  </span>
                </span>
              </li>
            ))
          : Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-[3.25rem] rounded-lg" />
              </li>
            ))}
      </ul>
    </ArticleSection>
  );
}
