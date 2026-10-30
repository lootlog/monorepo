import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { catalogSlug } from "@lootlog/domain/catalog-slug";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcDrops } from "@/components/npcs/npc-drops";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import {
  isNpcCatalogKey,
  npcPageParams,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";

// A template, a legacy and a runtime identity may share an id.
const NPC_IDENTITIES = 3;

export const Route = createFileRoute("/npcs_/$npcSlug")({
  component: NpcRoute,
  head: () => ({
    meta: [{ title: `${t("meta.npcTitle")} | ${t("meta.title")}` }],
  }),
});

function NpcRoute() {
  const { npcSlug } = Route.useParams();

  const segment = readPageSegment(npcSlug);

  // The id finds the monster; old links carry the catalog key instead and
  // move to the id and name once it loads.
  const npcQuery = useCatalogControllerGetNpcs(
    {
      ...(isNpcCatalogKey(npcSlug)
        ? { keys: [npcSlug] }
        : { ids: segment ? [segment.id] : [] }),
      gameVersion: WIKI_GAME_VERSION,
      limit: NPC_IDENTITIES,
    },
    { query: { enabled: segment !== undefined || isNpcCatalogKey(npcSlug) } },
  );

  // One id may name monsters of several identities; the name picks one.
  const npc =
    npcQuery.data?.hits.find(
      (hit) => catalogSlug(hit.name) === segment?.slug,
    ) ?? npcQuery.data?.hits[0];

  if (npc && npcPageParams(npc).npcSlug !== npcSlug) {
    return <Navigate to="/npcs/$npcSlug" params={npcPageParams(npc)} replace />;
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {npcQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : (!segment && !isNpcCatalogKey(npcSlug)) || (npcQuery.data && !npc) ? (
        <p className="text-sm text-muted-foreground">
          {t("catalog.npcNotFound")}
        </p>
      ) : (
        <>
          <header className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5">
            {npc ? (
              <NpcTile
                npc={npc}
                levelLabel={(level) => t("common.levelShort", { level })}
              />
            ) : (
              <Skeleton className="h-10 w-8 rounded-md" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              {npc ? (
                <>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                    {npc.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {npcSummary(npc)}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-64" />
                </>
              )}
            </div>
          </header>

          <section aria-labelledby="npc-drops" className="flex flex-col gap-4">
            <h2
              id="npc-drops"
              className="text-base font-semibold text-foreground"
            >
              {t("catalog.dropsTitle")}
            </h2>
            {npc ? (
              <NpcDrops npc={npc} />
            ) : (
              <CatalogItemGrid
                items={undefined}
                isError={false}
                placeholders={8}
                emptyLabel=""
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
