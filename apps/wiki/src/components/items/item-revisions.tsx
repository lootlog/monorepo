import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ArticleSection } from "@/components/article/article-section";
import { t } from "@/i18n/messages";
import { ItemRevisionEntry } from "./item-revision-entry";

/** The changes the game made to the item, newest first; none hides it. */
export function ItemRevisions({
  item,
}: {
  item: Pick<CatalogItemDtoOutput, "revisions" | "rarity" | "elasticLevel">;
}) {
  if (item.revisions.length === 0) return null;

  return (
    <ArticleSection
      id="item-revisions"
      title={t("revisions.title")}
      count={item.revisions.length > 1 ? item.revisions.length : undefined}
      description={t("revisions.description")}
    >
      <ol className="flex flex-col gap-3">
        {[...item.revisions].reverse().map((revision) => (
          <ItemRevisionEntry
            key={`${revision.changedBy}-${revision.lvl}-${revision.stat}`}
            revision={revision}
            rarity={item.rarity}
            elasticLevel={item.elasticLevel}
          />
        ))}
      </ol>
    </ArticleSection>
  );
}
