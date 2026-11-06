import { Navigate, createFileRoute, linkOptions } from "@tanstack/react-router";
import { useCatalogControllerGetNpcs } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcDrops } from "@/components/npcs/npc-drops";
import { ArticleSection } from "@/components/article/article-section";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { NpcInfobox } from "@/components/npcs/npc-infobox";
import { NpcLocations } from "@/components/npcs/npc-locations";
import { useStickyTop } from "@/hooks/use-sticky-top";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import { npcPageParams } from "@/lib/catalog-links";
import {
  findPageNpc,
  loadCatalogItems,
  loadCatalogNpcs,
  npcDropsQuery,
  npcPageQuery,
} from "@/lib/catalog-page-queries";
import { linkPreviewMeta, npcLinkPreview } from "@/lib/link-preview";

export const Route = createFileRoute("/npcs_/$npcSlug")({
  component: NpcRoute,
  // The page loads the monster and its drops itself; a failed load leaves
  // it the error.
  loader: async ({ params }) => {
    const query = npcPageQuery(params.npcSlug);

    if (!query) return { npc: undefined, drops: [] };

    const npcs = await loadCatalogNpcs(query).catch(() => undefined);
    const npc = npcs && findPageNpc(npcs.hits, params.npcSlug);

    if (!npc) return { npc: undefined, drops: [] };

    const drops = await loadCatalogItems(npcDropsQuery(npc.key)).catch(
      () => undefined,
    );

    return { npc, drops: drops?.hits ?? [] };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.npc
      ? linkPreviewMeta(npcLinkPreview(loaderData.npc, loaderData.drops))
      : [{ title: `${t("meta.npcTitle")} | ${t("meta.title")}` }],
  }),
});

function NpcRoute() {
  const infoboxSticky = useStickyTop();
  const { npcSlug } = Route.useParams();

  const query = npcPageQuery(npcSlug);

  // The id finds the monster; old links carry the catalog key instead and
  // move to the id and name once it loads.
  const npcQuery = useCatalogControllerGetNpcs(query ?? {}, {
    query: { enabled: query !== undefined },
  });

  const npc = npcQuery.data && findPageNpc(npcQuery.data.hits, npcSlug);

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

  if (!query || (npcQuery.data && !npc)) {
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
        <div
          {...infoboxSticky}
          className="xl:sticky xl:col-start-2 xl:row-start-1"
        >
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
