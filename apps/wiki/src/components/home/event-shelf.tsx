import { useCatalogControllerGetEvents } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { t } from "@/i18n/messages";
import { WIKI_EVENTS_QUERY } from "@/lib/item-events";
import { EventPoster } from "./event-poster";

const EVENTS_SHOWN = 10;

const SHELF_CLASS =
  "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] md:-mx-6 md:px-6";

export function EventShelf() {
  const { data, isError } = useCatalogControllerGetEvents(WIKI_EVENTS_QUERY);

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!data) {
    return (
      <ul aria-busy="true" className={SHELF_CLASS}>
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index}>
            <Skeleton className="h-72 w-52 rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (data.events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("catalog.eventsEmpty")}
      </p>
    );
  }

  return (
    <ul className={SHELF_CLASS}>
      {data.events.slice(0, EVENTS_SHOWN).map((event) => (
        <li key={event.slug} className="snap-start">
          <EventPoster event={event} />
        </li>
      ))}
    </ul>
  );
}
