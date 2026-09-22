import { ItemRarity, type Loot } from "@/lib/loots/loot-types";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import * as m from "framer-motion/m";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import {
  LEGENDARY_LOOT_CARD_CLASS,
  LEGENDARY_LOOT_ROW_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
import { LootPresentation } from "./loot-presentation";
import { LootHeaderActions } from "./loot-header-actions";

type Props = { loot: Loot; isNew?: boolean; variant?: "card" | "embedded" };

const animate = {
  opacity: 1,
  scale: 1,
};

export const LootsListItem = ({ loot, isNew, variant = "card" }: Props) => {
  const { openLootDetails } = useSelectedLoot();
  const { filters, setFilters } = useLootsFilters();

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  const lootContent = (
    <LootPresentation
      loot={loot}
      headerActions=<LootHeaderActions
        commentsCount={loot.commentsCount}
        onOpenDetails={() => openLootDetails(loot.id)}
      />
      onShowPlayerLoots={(playerName) => setFilters({ players: [playerName] })}
      selectedPlayerNames={filters.players}
      selectedItemNames={filters.itemNames}
    />
  );

  return (
    <m.div
      data-testid="loot-list-item"
      data-presentation={variant}
      initial={isNew ? { opacity: 0, scale: 0.98 } : false}
      animate={animate}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-full",
        variant === "embedded" &&
          "group relative flex flex-col transition-colors hover:bg-muted/20",
        variant === "embedded" && hasLegendaryItem && LEGENDARY_LOOT_ROW_CLASS,
      )}
    >
      {variant === "embedded" ? (
        lootContent
      ) : (
        <Card
          data-ornament="minor"
          data-new-legendary={isNew && hasLegendaryItem ? "" : undefined}
          className={cn(
            "group relative flex h-full flex-col gap-0 overflow-visible rounded-xl border-border bg-card p-0",
            "transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md",
            isNew && "border-primary/70 ring-1 ring-primary/40 shadow-lg",
            hasLegendaryItem && LEGENDARY_LOOT_CARD_CLASS,
          )}
        >
          {lootContent}
        </Card>
      )}
    </m.div>
  );
};
