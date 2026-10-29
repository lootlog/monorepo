import { Link } from "@tanstack/react-router";
import type {
  CatalogDropSourceDtoOutput,
  CatalogItemDtoOutput,
} from "@lootlog/client/search";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { ItemsByRarity } from "@/components/catalog/items-by-rarity";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import { npcPageParams } from "@/lib/catalog-links";

type EventMonsterItemsProps = {
  /** None for the event's items Lootlog knows no monster of. */
  monster: CatalogDropSourceDtoOutput | undefined;
  items: readonly CatalogItemDtoOutput[];
};

/** The event's items of one monster, by rarity. */
export function EventMonsterItems({ monster, items }: EventMonsterItemsProps) {
  const headingId = `event-monster-${monster?.key ?? "other"}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex min-h-10 items-center gap-3 border-b border-border/50 pb-3">
        {monster ? (
          <NpcTile
            npc={{
              icon: monster.icon,
              lvl: monster.lvl ?? undefined,
              name: monster.name,
            }}
            levelLabel={(level) => t("common.levelShort", { level })}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className="truncate text-base font-semibold text-foreground"
          >
            {monster ? monster.name : t("catalog.eventOtherItems")}
          </h2>
          {monster ? (
            <p className="truncate text-xs text-muted-foreground">
              {npcSummary(monster)}
            </p>
          ) : null}
        </div>
        {monster ? (
          <ChevronLink
            render={
              <Link to="/npcs/$npcSlug" params={npcPageParams(monster)} />
            }
          >
            {t("home.open")}
          </ChevronLink>
        ) : null}
      </div>
      <ItemsByRarity items={items} idPrefix={headingId} />
    </section>
  );
}
