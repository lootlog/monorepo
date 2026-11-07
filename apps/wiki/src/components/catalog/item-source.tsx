import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { TruncatedText } from "@/components/truncated-text";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";

/** The monster the item drops from, preferring one that still drops it. */
export function ItemSource({ item }: { item: CatalogItemDtoOutput }) {
  const source =
    item.droppedBy.find(({ retired }) => !retired) ?? item.droppedBy[0];

  if (!source) return null;

  return (
    <TruncatedText
      label={`${t("catalog.droppedBy")} ${source.name}`}
      className="text-xs text-muted-foreground"
    >
      {t("catalog.droppedBy")}{" "}
      <Link
        to="/npcs/$npcSlug"
        params={npcPageParams(source)}
        className="font-medium text-foreground outline-none hover:underline focus-visible:underline"
      >
        {source.name}
      </Link>
    </TruncatedText>
  );
}
