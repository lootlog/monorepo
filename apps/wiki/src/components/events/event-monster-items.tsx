import { Link } from "@tanstack/react-router";
import type {
  CatalogDropSourceDtoOutput,
  CatalogItemDtoOutput,
} from "@lootlog/client/search";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { NpcPortrait } from "@/components/common/npc-portrait";
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
    <section
      id={headingId}
      aria-labelledby={`${headingId}-title`}
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <div className="flex min-h-10 items-center gap-4 border-b border-border/60 pb-3">
        {monster ? <NpcPortrait icon={monster.icon} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <h2
            id={`${headingId}-title`}
            className="truncate text-lg font-semibold tracking-tight text-foreground"
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
