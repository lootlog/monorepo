import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { HighlightedText } from "@/components/highlighted-text";
import { TruncatedText } from "@/components/truncated-text";
import { itemPageParams, itemPageSearch } from "@/lib/catalog-links";
import { type ItemUpgrade, NO_UPGRADE } from "@lootlog/domain/item-upgrade";

type ItemNameLinkProps = {
  item: CatalogItemDtoOutput;
  /** The upgrade the item's page opens at. */
  upgrade?: ItemUpgrade;
  /** The searched phrase, marked in the name. */
  highlight: string;
};

/** The item's name on one line in its rarity's color, linking to its page. */
export function ItemNameLink({
  item,
  upgrade = NO_UPGRADE,
  highlight,
}: ItemNameLinkProps) {
  return (
    <Link
      to="/items/$itemSlug"
      params={itemPageParams(item)}
      search={itemPageSearch(upgrade)}
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
