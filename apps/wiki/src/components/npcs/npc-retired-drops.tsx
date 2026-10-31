import { ChevronDown } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { ItemsByRarity } from "@/components/catalog/items-by-rarity";
import { t } from "@/i18n/messages";

/** The items a monster dropped before its loot changed, folded away. */
export function NpcRetiredDrops({
  items,
}: {
  items: readonly CatalogItemDtoOutput[];
}) {
  return (
    <Collapsible className="flex flex-col gap-3 border-t border-border/50 pt-4">
      <h3 className="text-sm font-semibold">
        <CollapsibleTrigger className="group/retired flex h-9 items-center gap-2 rounded-md px-1 text-left text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-panel-open/retired:rotate-0 motion-reduce:transition-none"
          />
          {t("catalog.retiredDropsTitle")}
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {items.length}
          </span>
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <div className="flex flex-col gap-6 px-1 pb-1">
          <p className="text-sm text-muted-foreground">
            {t("catalog.retiredDropsDescription")}
          </p>
          <ItemsByRarity items={items} idPrefix="npc-retired-drops" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
