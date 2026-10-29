import { Gem } from "lucide-react";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { t } from "@/i18n/messages";
import { ShortcutTile } from "./shortcut-tile";

const RARITIES = [
  ItemRarity.LEGENDARY,
  ItemRarity.HEROIC,
  ItemRarity.UPGRADED,
  ItemRarity.UNIQUE,
] as const;

/** Opens the item search filtered to one rarity. */
export function RarityShortcuts() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {RARITIES.map((rarity) => (
        <li key={rarity}>
          <ShortcutTile
            icon={Gem}
            label={t(`itemRarity.${rarity}`)}
            search={{ rarities: rarity }}
            toneClassName={LOOT_RARITY_TEXT_CLASS[rarity]}
          />
        </li>
      ))}
    </ul>
  );
}
