import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { NewMonsterCard } from "./new-monster-card";

// Bosses an event or an update adds; common monsters would crowd them out.
const NEW_MONSTERS = {
  types: ["HERO", "EVENT_HERO", "TITAN", "COLOSSUS"],
  sort: "newest",
  limit: 4,
} as const;

/** The bosses Lootlog saw for the first time most recently, with their drops. */
export function NewMonsters() {
  const { data, isError } = useCatalogControllerGetNpcs({
    ...NEW_MONSTERS,
    gameVersion: WIKI_GAME_VERSION,
    types: [...NEW_MONSTERS.types],
  });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (data?.hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newMonstersEmpty")}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {data
        ? data.hits.map((npc) => (
            <li key={npc.key}>
              <NewMonsterCard npc={npc} />
            </li>
          ))
        : Array.from({ length: NEW_MONSTERS.limit }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-[7.5rem] rounded-xl" />
            </li>
          ))}
    </ul>
  );
}
