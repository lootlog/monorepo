import { Link } from "@tanstack/react-router";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { t } from "@/i18n/messages";
import { itemEvents } from "@/lib/item-events";

/** The events an item dropped during, each a link to its page; nothing for an item of none. */
export function ItemEventLinks({ stat }: { stat: string }) {
  const events = itemEvents(stat);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
      <span className="text-muted-foreground">{t("item.events")}:</span>
      <ul className="flex flex-wrap gap-1.5">
        {events.map((event) => (
          <li key={event}>
            <Link
              to="/events/$eventSlug"
              params={{ eventSlug: itemEventSlug(event) }}
              className="block rounded-md border border-border bg-card px-2 py-0.5 text-foreground outline-none hover:border-primary/60 focus-visible:border-primary"
            >
              {event}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
