import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type ItemSearchHitContentProps = {
  item: {
    icon: string;
    lvl: number;
    name: string;
    rarity: string | null;
  };
};

/**
 * One item in a search list: its icon, name, rarity and level, inside whichever
 * row element the list selects it with.
 */
export const ItemSearchHitContent = ({ item }: ItemSearchHitContentProps) => {
  const { t } = useTranslation();

  return (
    <>
      <ItemImage icon={item.icon} rarity={resolveItemRarity(item.rarity)} />
      <span className="min-w-0 truncate font-medium">{item.name}</span>
      {item.rarity && (
        <span
          className={cn(
            "shrink-0",
            LOOT_RARITY_TEXT_CLASS[resolveItemRarity(item.rarity)],
          )}
        >
          {t(`itemRarity.${item.rarity}`, { defaultValue: item.rarity })}
        </span>
      )}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
        {item.lvl > 0 && t("loots.searchCommand.level", { level: item.lvl })}
      </span>
    </>
  );
};
