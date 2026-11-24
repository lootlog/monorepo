import { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import type { Loot } from "@/lib/loots/loot-types";
import { cn } from "cn";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import {
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { LootPresentation } from "./loot-presentation";
import { LootHeaderActions } from "./loot-header-actions";
import { LootItemStackLootIdContext } from "./loot-item-stack-context";
import { EmberSparks } from "@lootlog/ui/components/ember-sparks";
import "./legendary-loot.css";
import { LootItemDraw } from "@/features/guild/loots-list/components/loot-draw/loot-item-draw";
import { isLootDrawItem } from "@lootlog/domain/loot-draw";

type Props = {
  loot: Loot;
  variant?: "tile" | "embedded";
  showWorld?: boolean;
};

export const LootsListItem = ({
  loot,
  variant = "tile",
  showWorld = false,
}: Props) => {
  const { filters, setFilters } = useLootsFilters();

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === DisplayItemRarity.LEGENDARY,
  );

  return (
    <div
      data-testid="loot-list-item"
      data-presentation={variant}
      className={cn(
        "group relative isolate flex h-full flex-col",
        LIST_TILE_HOVER_CLASS,
        variant === "tile" && LIST_TILE_RULE_CLASS,
        variant === "embedded" && !hasLegendaryItem && "even:bg-background/40",
        hasLegendaryItem && "loot-legendary",
      )}
    >
      {hasLegendaryItem && <EmberSparks seed={loot.id} />}
      <LootItemStackLootIdContext value={loot.id}>
        <LootPresentation
          loot={loot}
          headerActions=<LootHeaderActions loot={loot} />
          decorateItem={(item, tile) =>
            isLootDrawItem(loot, item, []) ? (
              <LootItemDraw loot={loot} item={item}>
                {tile}
              </LootItemDraw>
            ) : (
              tile
            )
          }
          onShowPlayerLoots={(playerName) =>
            setFilters({ players: [playerName] })
          }
          selectedPlayerNames={filters.players}
          selectedItemNames={filters.itemNames}
          showWorld={showWorld}
        />
      </LootItemStackLootIdContext>
    </div>
  );
};
