import { Link } from "@tanstack/react-router";
import { ChevronRight, Gem } from "lucide-react";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

const RARITIES = [
  ItemRarity.LEGENDARY,
  ItemRarity.HEROIC,
  ItemRarity.UPGRADED,
  ItemRarity.UNIQUE,
] as const;

/** Opens the item search filtered to one rarity. */
export function RarityShortcuts() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {RARITIES.map((rarity) => (
        <li key={rarity}>
          <Link
            to="/items"
            search={{ ...EMPTY_ITEMS_SEARCH, rarities: rarity }}
            className="group/rarity flex h-full items-center gap-3 rounded-lg border border-border/50 bg-card p-4 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-md bg-current/10",
                LOOT_RARITY_TEXT_CLASS[rarity],
              )}
            >
              <Gem aria-hidden="true" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className={cn(
                  "truncate text-sm font-semibold",
                  LOOT_RARITY_TEXT_CLASS[rarity],
                )}
              >
                {t(`itemRarity.${rarity}`)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {t("home.rarityLink")}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-[translate] duration-150 group-hover/rarity:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
