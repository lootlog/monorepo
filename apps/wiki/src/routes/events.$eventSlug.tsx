import { createFileRoute } from "@tanstack/react-router";
import { groupBy, orderBy } from "es-toolkit";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { EventMonsterItems } from "@/components/events/event-monster-items";
import { useEventItems } from "@/hooks/use-event-items";
import { t } from "@/i18n/messages";
import { dropSourceMonsterKey } from "@/lib/catalog-links";
import { itemEvents } from "@/lib/item-events";

export const Route = createFileRoute("/events/$eventSlug")({
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
    Object.values(
      groupBy(items ?? [], (item) => {
        const [monster] = item.droppedBy;

        return monster ? dropSourceMonsterKey(monster) : "";
      }),
    ).map((monsterItems) => ({
      monster: monsterItems[0]?.droppedBy[0],
      items: monsterItems,
    })),
    [
      ({ monster }) => (monster ? 1 : 0),
      ({ monster }) => monster?.lvl ?? 0,
      ({ monster }) => monster?.name ?? "",
      ({ monster }) => monster?.type ?? "",
    ],
    ["desc", "desc", "asc", "asc"],
  );

  return (
    <div className="flex flex-col gap-8 py-6">
      <header className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card p-5">
        {name ? (
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
            {name}
          </h1>
        ) : (
          <Skeleton className="h-8 w-56" />
        )}
        <p className="text-sm text-muted-foreground">
          {items
            ? t("catalog.eventDescription", {
                count: items.length.toLocaleString("pl-PL"),
              })
            : t("search.loading")}
        </p>
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
