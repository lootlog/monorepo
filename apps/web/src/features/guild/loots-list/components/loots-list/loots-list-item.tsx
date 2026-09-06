import { ItemRarity, type Loot } from "@/lib/loots/loot-types";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { motion, useReducedMotion } from "framer-motion";
import { useThemeMeta } from "@/themes";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { LootPresentation } from "./loot-presentation";
import { LootHeaderActions } from "./loot-header-actions";
type Props = { loot: Loot; isNew?: boolean; variant?: "card" | "embedded" };
export const LootsListItem = ({ loot, isNew, variant = "card" }: Props) => {
  const { openLootDetails } = useSelectedLoot();
  const { filters, setFilters } = useLootsFilters();
  const { isRukiaTheme } = useThemeMeta();
  const shouldReduceMotion = useReducedMotion();

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );
  let initialAnimation: false | { opacity: number; scale?: number } = false;
  const animate: { opacity: number; scale?: number } = {
    opacity: 1,
    scale: 1,
  };

  if (isNew) {
    if (shouldReduceMotion) {
      initialAnimation = { opacity: 0 };
    } else {
      initialAnimation = { opacity: 0, scale: 0.98 };
    }
  }

  const lootContent = (
    <LootPresentation
      loot={loot}
      headerActions={
        <LootHeaderActions
          commentsCount={loot.commentsCount}
          onOpenDetails={() => openLootDetails(loot.id)}
        />
      }
      onShowPlayerLoots={(playerName) => setFilters({ players: [playerName] })}
      selectedPlayerNames={filters.players}
      selectedItemNames={filters.itemNames}
    />
  );

  return (
    <motion.div
      data-testid="loot-list-item"
      data-presentation={variant}
      initial={initialAnimation}
      animate={animate}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-full",
        variant === "embedded" &&
          "group relative flex flex-col gap-0 px-4 pt-2 pb-1 transition-colors hover:bg-muted/20",
        variant === "embedded" && hasLegendaryItem && "bg-red-500/5",
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
            "group relative px-4 pt-2 pb-1 h-full flex flex-col gap-0",
            "bg-card border-border overflow-visible",
            "hover:bg-card hover:border-primary/30 hover:shadow-md transition-[background-color,border-color,box-shadow] duration-200",
            isNew && "border-primary/70 ring-1 ring-primary/40 shadow-lg",
            hasLegendaryItem &&
              "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:border-red-500/100",
          )}
        >
          {lootContent}
        </Card>
      )}
    </motion.div>
  );
};
