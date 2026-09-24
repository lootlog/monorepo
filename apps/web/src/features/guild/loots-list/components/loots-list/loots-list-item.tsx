import { ItemRarity, type Loot } from "@/lib/loots/loot-types";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import * as m from "framer-motion/m";
import { useThemeMeta } from "@/themes";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import {
  LEGENDARY_LOOT_CARD_CLASS,
  LEGENDARY_LOOT_ROW_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
import { LootPresentation } from "./loot-presentation";
import { LootHeaderActions } from "./loot-header-actions";
import { LootItemStackLootIdContext } from "./loot-item-stack-context";

type Props = { loot: Loot; isNew?: boolean; variant?: "card" | "embedded" };

const animate = {
  opacity: 1,
  scale: 1,
};

export const LootsListItem = ({ loot, isNew, variant = "card" }: Props) => {
  const { openLootDetails } = useSelectedLoot();
  const { filters, setFilters } = useLootsFilters();
  const { isRukiaTheme } = useThemeMeta();

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  const lootContent = (
    <LootItemStackLootIdContext value={loot.id}>
      <LootPresentation
        loot={loot}
        headerActions=<LootHeaderActions
          commentsCount={loot.commentsCount}
          onOpenDetails={() => openLootDetails(loot.id)}
        />
        onShowPlayerLoots={(playerName) =>
          setFilters({ players: [playerName] })
        }
        selectedPlayerNames={filters.players}
        selectedItemNames={filters.itemNames}
      />
    </LootItemStackLootIdContext>
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
        variant === "card" &&
          isRukiaTheme &&
          "rounded-xl hover:shadow-[inset_0_0_8px_1px_rgba(200,230,255,0.4),0_0_10px_2px_rgba(180,220,255,0.25)] transition-shadow duration-300",
      )}
    >
      {variant === "embedded" ? (
        lootContent
      ) : (
        <Card
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
