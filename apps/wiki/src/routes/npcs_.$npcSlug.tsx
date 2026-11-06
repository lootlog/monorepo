import { Navigate, createFileRoute, linkOptions } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { catalogSlug } from "@lootlog/domain/catalog-slug";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcDrops } from "@/components/npcs/npc-drops";
import { ArticleSection } from "@/components/article/article-section";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { NpcInfobox } from "@/components/npcs/npc-infobox";
import { NpcLocations } from "@/components/npcs/npc-locations";
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

  if (npcQuery.isError) {
    return (
      <p role="alert" className="py-6 text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if ((!segment && !isNpcCatalogKey(npcSlug)) || (npcQuery.data && !npc)) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {t("catalog.npcNotFound")}
      </p>
    );
  }

  return (
    <article className="flex flex-col gap-6 py-6">
      <PageBreadcrumbs
        items={[
          {
            label: t("navigation.npcs"),
            link: linkOptions({
              to: "/npcs",
              search: { query: "", types: "" },
            }),
          },
          ...(npc
            ? [
                {
                  label: t(`npcTypes.${npc.type}`),
                  link: linkOptions({
                    to: "/npcs",
                    search: { query: "", types: npc.type },
                  }),
                },
                { label: npc.name },
              ]
            : []),
        ]}
      />

      <header className="flex min-w-0 flex-col gap-1">
        {npc ? (
          <>
            <p className="text-sm text-muted-foreground">{npcSummary(npc)}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
              {npc.name}
            </h1>
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-72" />
          </>
        )}
      </header>

      <div className="grid items-start gap-x-8 gap-y-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1">
          {npc ? (
            <NpcInfobox npc={npc} />
          ) : (
            <Skeleton className="h-[26rem] rounded-xl" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-12 xl:col-start-1 xl:row-start-1">
          <ArticleSection id="npc-drops" title={t("catalog.dropsTitle")}>
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
          </ArticleSection>

          <ArticleSection
            id="npc-locations"
            title={t("catalog.locationsTitle")}
          >
            {npc ? (
              <NpcLocations locations={npc.locations} />
            ) : (
              <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
            )}
          </ArticleSection>
        </div>
      </div>
    </article>
  );
}
