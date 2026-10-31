import { Link } from "@tanstack/react-router";
import { groupBy } from "es-toolkit";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { latestEventOf } from "@/lib/item-events";
import { NewItemsCard } from "./new-items-card";
import { NewItemsCardsSkeleton } from "./new-items-cards-skeleton";

// Event items carry the event's name; the newest of them are the latest
// events' own, and older items that came back sort after them.
const NEW_EVENT_ITEMS = {
  statKeys: ["etiquette"],
  sort: "id:desc",
  limit: 96,
} as const;

const EVENTS_SHOWN = 4;

const ITEMS_SHOWN = 12;

/** The newest items of the latest events, under each event's name. */
export function NewEventItems() {
  const { data, isError } = useCatalogControllerGetItems({
    ...NEW_EVENT_ITEMS,
    gameVersion: WIKI_GAME_VERSION,
    statKeys: [...NEW_EVENT_ITEMS.statKeys],
  });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!data) return <NewItemsCardsSkeleton count={EVENTS_SHOWN} />;

  const events = Object.entries(
    groupBy(
      data.hits.filter((item) => latestEventOf(item.stat) !== undefined),
      (item) => latestEventOf(item.stat) ?? "",
    ),
  ).slice(0, EVENTS_SHOWN);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newEventItemsEmpty")}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {events.map(([event, items]) => (
        <li key={event}>
          <NewItemsCard
            title={event}
            action={
              <ChevronLink
                render={
                  <Link
                    to="/events/$eventSlug"
                    params={{ eventSlug: itemEventSlug(event) }}
                  />
                }
              >
                {t("home.showAllEventItems")}
              </ChevronLink>
            }
            items={items.slice(0, ITEMS_SHOWN)}
          />
        </li>
      ))}
    </ul>
  );
}
