import {
  Navigate,
  createFileRoute,
  linkOptions,
  redirect,
} from "@tanstack/react-router";
import {
  getCatalogControllerGetItemsQueryOptions,
  getCatalogControllerGetNpcsQueryOptions,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcDrops } from "@/components/npcs/npc-drops";
import { ArticleSection } from "@/components/article/article-section";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { ReportButton } from "@/components/reports/report-button";
import { NpcFacts } from "@/components/npcs/npc-facts";
import { NpcFormerLevels } from "@/components/npcs/npc-former-levels";
import { NpcLocations } from "@/components/npcs/npc-locations";
import { EMPTY_NPCS_SEARCH } from "@/navigation/wiki-navigation";
import { t } from "@/i18n/messages";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";
import { npcKindLabel, npcKindOf, npcKindSearch } from "@/lib/npc-types";
import { npcPageParams } from "@/lib/catalog-links";
import {
  findPageNpc,
  npcDropsQuery,
  npcPageQuery,
} from "@/lib/catalog-page-queries";
import {
  canonicalLink,
  linkPreviewMeta,
  npcLinkPreview,
} from "@/lib/link-preview";

export const Route = createFileRoute("/npcs_/$npcSlug")({
  component: NpcRoute,
  // The page loads the monster and its drops itself; a failed load leaves
  // it the error.
  loader: async ({ params, context: { queryClient } }) => {
    const query = npcPageQuery(params.npcSlug);

    if (!query) return { npc: undefined, drops: [] };

    const npcs = await queryClient
      .ensureQueryData(getCatalogControllerGetNpcsQueryOptions(query))
      .catch(() => undefined);

    const npc = npcs && findPageNpc(npcs.hits, params.npcSlug);

    if (!npc) return { npc: undefined, drops: [] };

    // Old links carry the catalog key or an outdated name.
    if (npcPageParams(npc).npcSlug !== params.npcSlug) {
      throw redirect({
        to: "/npcs/$npcSlug",
        params: npcPageParams(npc),
        statusCode: 301,
      });
    }

    const drops = await queryClient
      .ensureQueryData(
        getCatalogControllerGetItemsQueryOptions(npcDropsQuery(npc.key)),
      )
      .catch(() => undefined);

    return { npc, drops: drops?.hits ?? [] };
  },
  head: ({ loaderData }) => ({
    links: loaderData?.npc
      ? [canonicalLink(`/npcs/${npcPageParams(loaderData.npc).npcSlug}`)]
      : [],
    meta: loaderData?.npc
      ? linkPreviewMeta(npcLinkPreview(loaderData.npc, loaderData.drops))
      : [{ title: `${t("meta.npcTitle")} | ${t("meta.title")}` }],
  }),
});

function NpcRoute() {
  const { npcSlug } = Route.useParams();

  const query = npcPageQuery(npcSlug);

  // The id finds the monster; old links carry the catalog key instead and
  // move to the id and name once it loads.
  const npcQuery = useCatalogControllerGetNpcs(query ?? {}, {
    query: { enabled: query !== undefined },
  });

  const npc = npcQuery.data && findPageNpc(npcQuery.data.hits, npcSlug);

  const kind = npc && npcKindOf(npc);

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
              search: EMPTY_NPCS_SEARCH,
            }),
          },
          ...(kind
            ? [
                {
                  label: npcKindLabel(kind),
                  link: linkOptions({
                    to: "/npcs",
                    search: { ...EMPTY_NPCS_SEARCH, ...npcKindSearch(kind) },
                  }),
                },
              ]
            : []),
          ...(npc ? [{ label: npc.name }] : []),
        ]}
      />

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          {npc ? (
            <>
              <div className="flex min-w-0 items-center gap-4">
                <NpcPortrait key={npc.icon} icon={npc.icon} size="md" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm text-muted-foreground">
                    <NpcKindLevel npc={npc} />
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
                    {npc.name}
                  </h1>
                </div>
              </div>
              <div
                role="group"
                aria-label={t("npc.actions")}
                className="flex flex-wrap gap-2"
              >
                <ReportButton
                  subjectType="NPC"
                  subjectId={npc.id}
                  name={npc.name}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-4">
                <Skeleton className="size-24 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-72 max-w-full" />
                </div>
              </div>
            </>
          )}
        </div>
        {npc ? (
          <>
            <NpcFacts npc={npc} />
            <NpcFormerLevels formerLevels={npc.formerLevels} />
          </>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </header>

      <div className="flex min-w-0 flex-col gap-12">
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

        <ArticleSection id="npc-locations" title={t("catalog.locationsTitle")}>
          {npc ? (
            <NpcLocations locations={npc.locations} />
          ) : (
            <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
          )}
        </ArticleSection>
      </div>
    </article>
  );
}
