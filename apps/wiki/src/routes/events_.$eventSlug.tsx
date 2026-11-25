import { createFileRoute, linkOptions, notFound } from "@tanstack/react-router";
import { orderBy } from "es-toolkit";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { EventMonsterItems } from "@/components/events/event-monster-items";
import { EventNotFound } from "@/components/events/event-not-found";
import { eventItemsQueryOptions, useEventItems } from "@/hooks/use-event-items";
import { t } from "@/i18n/messages";
import { groupItemsByMonster } from "@/lib/group-items-by-monster";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";
import { prefetchPageQueries } from "@/lib/catalog-page-queries";
import { eventNameOf } from "@/lib/item-events";
import { wikiPageHead } from "@/lib/link-preview";
import { formatNumber } from "@lootlog/domain/locale";

export const Route = createFileRoute("/events_/$eventSlug")({
  component: EventRoute,
  loader: async ({ params, context: { queryClient } }) => {
    const query = eventItemsQueryOptions(params.eventSlug);

    await prefetchPageQueries(queryClient.prefetchQuery(query));

    const items = queryClient.getQueryData(query.queryKey);

    const name = items && eventNameOf(items, params.eventSlug);

    if (items && !name) throw notFound();

    return { name };
  },
  head: ({ loaderData, params }) =>
    loaderData?.name
      ? wikiPageHead({
          path: `/events/${params.eventSlug}`,
          title: loaderData.name,
          documentTitle: t("meta.gameTitle", { name: loaderData.name }),
          description: t("linkPreview.eventDescription", {
            name: loaderData.name,
          }),
          breadcrumbs: [
            { name: t("meta.eventsTitle"), path: "/events" },
            { name: loaderData.name, path: `/events/${params.eventSlug}` },
          ],
        })
      : { meta: [{ title: `${t("meta.eventTitle")} | ${t("meta.title")}` }] },
  notFoundComponent: EventNotFound,
});

function EventRoute() {
  const { eventSlug } = Route.useParams();

  const { data: items, isError } = useEventItems(eventSlug);

  const name = eventNameOf(items ?? [], eventSlug);

  if (isError) {
    return (
      <p role="alert" className="py-6 text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (items && !name) {
    return <EventNotFound />;
  }

  const monsters = orderBy(
    groupItemsByMonster(items ?? []),
    [
      ({ monster }) => (monster ? 1 : 0),
      ({ monster }) => monster?.lvl ?? 0,
      ({ monster }) => monster?.name ?? "",
      ({ monster }) => monster?.type ?? "",
    ],
    ["desc", "desc", "asc", "asc"],
  );

  return (
    <div className="flex flex-col gap-10 py-6">
      <PageBreadcrumbs
        items={[
          {
            label: t("navigation.events"),
            link: linkOptions({ to: "/events" }),
          },
          ...(name ? [{ label: name }] : []),
        ]}
      />
      <div className="flex flex-col gap-5">
        {name ? (
          <PortalPageHeader
            eyebrow={
              isHeroTrackersEvent(name) ? (
                <p className="font-medium text-muted-foreground">
                  {t("npc.heroTrackers")}
                </p>
              ) : null
            }
            title={name}
            description={
              items
                ? t("catalog.eventDescription", {
                    count: formatNumber(items.length),
                  })
                : t("search.loading")
            }
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-10 w-72" />
            <p className="text-sm text-muted-foreground md:text-[0.9375rem]">
              {t("search.loading")}
            </p>
          </div>
        )}
        {items ? (
          <nav aria-label={t("catalog.eventMonsters")}>
            <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
              {monsters.flatMap(({ monster }) =>
                monster
                  ? [
                      <li key={monster.key} className="w-28 shrink-0">
                        <a
                          href={`#event-monster-${monster.key}`}
                          className="group/monster flex flex-col gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <NpcPortrait
                            icon={monster.icon}
                            size="md"
                            className="w-28 transition-[border-color] duration-150 group-hover/monster:border-primary/50 motion-reduce:transition-none"
                          />
                          <span className="truncate text-xs font-medium text-foreground group-hover/monster:underline">
                            {monster.name}
                          </span>
                        </a>
                      </li>,
                    ]
                  : [],
              )}
            </ul>
          </nav>
        ) : null}
      </div>
      {items ? (
        monsters.map(({ monster, items: monsterItems }) => (
          <EventMonsterItems
            key={monster?.key ?? "other"}
            monster={monster}
            items={monsterItems}
          />
        ))
      ) : (
        <CatalogItemGrid
          items={undefined}
          isError={false}
          placeholders={12}
          emptyLabel=""
        />
      )}
    </div>
  );
}
