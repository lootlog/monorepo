import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";

/** The previewed item drawn over a slot, as it would sit there. */
export function EquipmentSlotPreview({ item }: { item: CatalogItemDtoOutput }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex scale-100 items-center justify-center rounded-md bg-background/70 opacity-100 transition-[opacity,scale] duration-200 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none"
    >
      <ItemImage icon={item.icon} rarity={resolveItemRarity(item.rarity)} />
    </span>
  );
}
