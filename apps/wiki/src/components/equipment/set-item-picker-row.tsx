import { Check } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { CommandItem } from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { ItemDamageTypes } from "@/components/catalog/item-damage-types";
import { ItemEvent } from "@/components/catalog/item-event";
import { ItemLegendaryBonus } from "@/components/catalog/item-legendary-bonus";
import { HighlightedText } from "@/components/highlighted-text";
import { useItemForCharacter } from "@/hooks/use-item-for-character";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";

type SetItemPickerRowProps = {
  item: CatalogItemDtoOutput;
  /** The row's name in the list, which the keyboard highlights. */
  value: string;
  /** The searched phrase, marked in the name. */
  query: string;
  isWorn: boolean;
  disabled: boolean;
  onSelect: () => void;
};

/**
 * One item the picker offers, as the set's character would loot it: its
 * name over its level, type, damage and legendary bonus.
 */
export function SetItemPickerRow({
  item,
  value,
  query,
  isWorn,
  disabled,
  onSelect,
}: SetItemPickerRowProps) {
  const looted = useItemForCharacter(item);
  const rarity = resolveItemRarity(item.rarity);
  const typeLabel = item.type ? ITEM_TILE_LABELS.type[item.type] : undefined;

  return (
    <CommandItem
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className="min-h-12 gap-3 rounded-lg px-2.5 py-1.5"
    >
      <ItemImage icon={item.icon} rarity={rarity} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "truncate font-medium",
            ITEM_RARITY_STYLES[rarity].label,
          )}
        >
          <HighlightedText text={item.name} query={query} />
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            {t("common.levelShort", { level: looted.lvl })}
          </span>
          {typeLabel ? <span className="truncate">{typeLabel}</span> : null}
          <ItemDamageTypes stat={looted.stat} />
          <ItemEvent stat={looted.stat} />
          <ItemLegendaryBonus stat={looted.stat} />
        </span>
      </span>
      {isWorn ? (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Check aria-hidden="true" />
          {t("equipment.worn")}
        </span>
      ) : null}
    </CommandItem>
  );
}
