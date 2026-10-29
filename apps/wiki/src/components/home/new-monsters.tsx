import { Link } from "@tanstack/react-router";
import { groupBy } from "es-toolkit";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import {
  dropSourceMonsterKey,
  npcPageParams,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";
import { NewItemsCard } from "./new-items-card";
import { NewItemsCardsSkeleton } from "./new-items-cards-skeleton";

// Margonem adds items in id order, so the newest ones name the bosses an
// update brought. Event items have their own section, and level 0 chests
// drop from many old bosses.
const NEW_BOSS_ITEMS = {
  dropSourceTypes: ["HERO", "EVENT_HERO", "TITAN", "COLOSSUS"],
  excludedStatKeys: ["etiquette"],
  minLevel: 1,
  sort: "id:desc",
  limit: 96,
} as const;

const MONSTERS_SHOWN = 4;

const ITEMS_SHOWN = 12;

/** The bosses behind the game's newest items, with those items. */
export function NewMonsters() {
  const { data, isError } = useCatalogControllerGetItems({
    ...NEW_BOSS_ITEMS,
    gameVersion: WIKI_GAME_VERSION,
    dropSourceTypes: [...NEW_BOSS_ITEMS.dropSourceTypes],
    excludedStatKeys: [...NEW_BOSS_ITEMS.excludedStatKeys],
  });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!data) return <NewItemsCardsSkeleton count={MONSTERS_SHOWN} />;

  const monsters = Object.values(
    groupBy(
      data.hits.filter((item) => item.droppedBy.length > 0),
      (item) => {
        const [monster] = item.droppedBy;

        return monster ? dropSourceMonsterKey(monster) : "";
      },
    ),
  ).slice(0, MONSTERS_SHOWN);

  if (monsters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newMonstersEmpty")}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {monsters.map((items) => {
        const [monster] = items[0]?.droppedBy ?? [];

        return monster ? (
          <li key={monster.key}>
            <NewItemsCard
              title={monster.name}
              details={npcSummary(monster)}
              media={
                <NpcTile
                  npc={{
                    icon: monster.icon,
                    lvl: monster.lvl ?? undefined,
                    name: monster.name,
                  }}
                  levelLabel={(level) => t("common.levelShort", { level })}
                />
              }
              action={
                <ChevronLink
                  render={
                    <Link to="/npcs/$npcSlug" params={npcPageParams(monster)} />
                  }
                >
                  {t("home.open")}
                </ChevronLink>
              }
              items={items.slice(0, ITEMS_SHOWN)}
            />
          </li>
        ) : null;
      })}
    </ul>
  );
}
