import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { Card } from "@lootlog/ui/components/card";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import {
  ITEM_RARITY_STYLES,
  ItemTileDetails,
} from "@lootlog/ui/components/item-tile-details";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { EquipButton } from "@/components/equipment/equip-button";
import { renderItemStat } from "@/components/render-item-stat";
import { t } from "@/i18n/messages";
import {
  itemPageParams,
  npcPageParams,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";
import { formatFirstSeenOn, ITEM_TILE_LABELS } from "@/lib/item-options";

export const Route = createFileRoute("/items_/$itemSlug")({
  component: ItemRoute,
  head: () => ({
    meta: [{ title: `${t("meta.itemTitle")} | ${t("meta.title")}` }],
  }),
});

function ItemRoute() {
  const { itemSlug } = Route.useParams();
  const id = readPageSegment(itemSlug)?.id;

  const { data, isError } = useCatalogControllerGetItems(
    {
      ids: id === undefined ? [] : [id],
      gameVersion: WIKI_GAME_VERSION,
      limit: 1,
    },
    { query: { enabled: id !== undefined } },
  );

  const item = data?.hits[0];

  // An old link, or one with an outdated name, moves to the item's own URL.
  if (item && itemPageParams(item).itemSlug !== itemSlug) {
    return (
      <Navigate to="/items/$itemSlug" params={itemPageParams(item)} replace />
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : id === undefined || (data && !item) ? (
        <p className="text-sm text-muted-foreground">
          {t("catalog.itemNotFound")}
        </p>
      ) : !item ? (
        <Skeleton className="h-64 w-full max-w-sm rounded-xl" />
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[20rem_1fr]">
          <div className="flex flex-col gap-3">
            <Card
              className={cn(
                "gap-0 overflow-hidden border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] p-0",
                ITEM_RARITY_STYLES[resolveItemRarity(item.rarity)].accent,
              )}
            >
              <h1 className="sr-only">{item.name}</h1>
              <ItemTileDetails
                color=""
                icon={item.icon}
                labels={ITEM_TILE_LABELS}
                name={item.name}
                rarity={resolveItemRarity(item.rarity)}
                renderStat={renderItemStat}
                stat={item.stat}
                type={item.type ?? ""}
              />
            </Card>
            <EquipButton item={item} />
          </div>

          <section
            aria-labelledby="item-sources"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="item-sources"
                className="text-base font-semibold text-foreground"
              >
                {t("catalog.droppedByTitle")}
              </h2>
              {item.firstSeenOn ? (
                <p className="text-sm text-muted-foreground">
                  {t("catalog.firstSeenOn", {
                    day: formatFirstSeenOn(item.firstSeenOn),
                  })}
                </p>
              ) : null}
            </div>
            {item.droppedBy.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("catalog.noSourcesYet")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {item.droppedBy.map((npc) => (
                  <li
                    key={npc.key}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3"
                  >
                    <NpcTile
                      npc={{
                        icon: npc.icon,
                        lvl: npc.lvl ?? undefined,
                        name: npc.name,
                      }}
                      levelLabel={(level) => t("common.levelShort", { level })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {npc.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {npc.type ? t(`npcTypes.${npc.type}`) : null}
                        {npc.lvl === null
                          ? null
                          : ` · ${t("common.levelShort", { level: npc.lvl })}`}
                      </p>
                    </div>
                    <ChevronLink
                      render={
                        <Link to="/npcs/$npcSlug" params={npcPageParams(npc)} />
                      }
                    >
                      {t("home.open")}
                    </ChevronLink>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
