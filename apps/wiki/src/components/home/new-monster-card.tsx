import { Link } from "@tanstack/react-router";
import {
  type CatalogNpcDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/search";
import { Card } from "@lootlog/ui/components/card";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";
import { formatFirstSeenOn, ITEM_TILE_LABELS } from "@/lib/item-options";

const DROPS_SHOWN = 8;

/** A newly seen monster with the first of its drops. */
export function NewMonsterCard({ npc }: { npc: CatalogNpcDtoOutput }) {
  const { data } = useCatalogControllerGetItems({
    droppedBy: npc.key,
    sort: "newest",
    limit: DROPS_SHOWN,
  });

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center gap-3">
        <NpcTile
          npc={npc}
          levelLabel={(level) => t("common.levelShort", { level })}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {npc.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {t(`npcTypes.${npc.type}`)} ·{" "}
            {t("common.levelShort", { level: npc.lvl })}
            {npc.firstSeenOn
              ? ` · ${formatFirstSeenOn(npc.firstSeenOn)}`
              : null}
          </p>
        </div>
        <ChevronLink
          render={<Link to="/npcs/$npcKey" params={{ npcKey: npc.key }} />}
        >
          {t("home.open")}
        </ChevronLink>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2">
        {data
          ? data.hits.map((item) => (
              <ItemTile
                key={item.id}
                item={{
                  icon: item.icon,
                  name: item.name,
                  rarity: resolveItemRarity(item.rarity),
                  stat: item.stat,
                  type: item.type,
                }}
                labels={ITEM_TILE_LABELS}
                renderStat={renderItemStat}
              />
            ))
          : Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-10 rounded-md" />
            ))}
        {data?.hits.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("catalog.noDropsYet")}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
