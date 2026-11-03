import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { HighlightedText } from "@/components/highlighted-text";
import { TruncatedText } from "@/components/truncated-text";
import { itemPageParams } from "@/lib/catalog-links";

type ItemNameLinkProps = {
  item: CatalogItemDtoOutput;
  /** The searched phrase, marked in the name. */
  highlight: string;
};

/** The item's name on one line in its rarity's color, linking to its page. */
export function ItemNameLink({ item, highlight }: ItemNameLinkProps) {
  return (
    <Link
      to="/items/$itemSlug"
      params={itemPageParams(item)}
      className={cn(
        "flex min-w-0 text-sm/tight font-semibold outline-none hover:underline focus-visible:underline",
        LOOT_RARITY_TEXT_CLASS[resolveItemRarity(item.rarity)],
      )}
    >
      <TruncatedText label={item.name}>
        <HighlightedText text={item.name} query={highlight} />
      </TruncatedText>
    </Link>
  );
}
