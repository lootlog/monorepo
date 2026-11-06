import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { orderBy } from "es-toolkit";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { EventMonsterItems } from "@/components/events/event-monster-items";
import { useEventItems } from "@/hooks/use-event-items";
import { t } from "@/i18n/messages";
import { groupItemsByMonster } from "@/lib/group-items-by-monster";
import { itemEvents } from "@/lib/item-events";

export const Route = createFileRoute("/events_/$eventSlug")({
  component: EventRoute,
  head: () => ({
    meta: [{ title: `${t("meta.eventTitle")} | ${t("meta.title")}` }],
  }),
});

/** Every item of one event, by monster, the strongest first, and rarity. */
function EventRoute() {
  const { eventSlug } = Route.useParams();

  const { data: items, isError } = useEventItems(eventSlug);

  // Any of the event's items names it as the game writes it.
  const name = itemEvents(items?.[0]?.stat ?? "").find(
    (label) => itemEventSlug(label) === eventSlug,
  );

  if (isError) {
    return (
      <p role="alert" className="py-6 text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (items && !name) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {t("catalog.eventNotFound")}
      </p>
    );
  }

  // The strongest monsters come first, an event boss's kinds side by side,
  // and items of no known monster last.
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
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          {name ? (
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
              {name}
            </h1>
          ) : (
            <Skeleton className="h-10 w-72" />
          )}
          <p className="text-sm text-muted-foreground md:text-[0.9375rem]">
            {items
              ? t("catalog.eventDescription", {
                  count: items.length.toLocaleString("pl-PL"),
                })
              : t("search.loading")}
          </p>
        </div>
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
      </header>
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
