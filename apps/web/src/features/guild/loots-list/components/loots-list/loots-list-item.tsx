import { ItemRarity, type Loot } from "@/lib/loots/loot-types";
import { cn } from "cn";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { LootPresentation } from "./loot-presentation";
import { LootHeaderActions } from "./loot-header-actions";
import { LootItemStackLootIdContext } from "./loot-item-stack-context";
import { LegendarySparks } from "./legendary-sparks";

type Props = {
  loot: Loot;
  /** `tile` fills the loot list; `embedded` is a row inside a section card. */
  variant?: "tile" | "embedded";
  /** Names the loot's world, for lists that span every world. */
  showWorld?: boolean;
};

export const LootsListItem = ({
  loot,
  variant = "tile",
  showWorld = false,
}: Props) => {
  const { filters, setFilters } = useLootsFilters();

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  return (
    <div
      data-testid="loot-list-item"
      data-presentation={variant}
      className={cn(
        // Isolated, so stack badges never paint over a pinned section heading.
        "group relative isolate flex h-full flex-col transition-colors hover:bg-muted/20",
        variant === "tile" && LIST_TILE_RULE_CLASS,
        // Alternate embedded rows so neighbouring kills stay apart in a dense
        // list; legendary rows keep their own glow.
        variant === "embedded" && !hasLegendaryItem && "even:bg-background/40",
        hasLegendaryItem && "loot-legendary",
      )}
    >
      {hasLegendaryItem && <LegendarySparks seed={loot.id} />}
      <LootItemStackLootIdContext value={loot.id}>
        <LootPresentation
          loot={loot}
          headerActions=<LootHeaderActions
            commentsCount={loot.commentsCount}
            lootId={loot.id}
          />
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
