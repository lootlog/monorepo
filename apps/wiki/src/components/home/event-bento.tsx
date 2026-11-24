import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { cn } from "cn";
import { useHomeEvents } from "@/hooks/use-home-events";
import { t } from "@/i18n/messages";
import { EventBentoTile } from "./event-bento-tile";

const LG_BREAKPOINT = 1024;

const WIDE_TILE = { span: "md:col-span-2", itemLimit: 11 };

const SMALL_TILE = { span: "", itemLimit: 5 };

const FEATURED_TILE = { span: "md:col-span-2 lg:row-span-2", itemLimit: 59 };

const GRID_CLASS = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4";

export function EventBento() {
  const { events, isError } = useHomeEvents();
  const isStacked = useMaxWidth(LG_BREAKPOINT);

  const tiles = [
    isStacked
      ? { ...FEATURED_TILE, itemLimit: WIDE_TILE.itemLimit }
      : FEATURED_TILE,
    WIDE_TILE,
    SMALL_TILE,
    SMALL_TILE,
  ];

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!events) {
    return (
      <ul aria-busy="true" className={GRID_CLASS}>
        {tiles.map(({ span }, index) => (
          <li key={index} className={span}>
            <Skeleton className="h-full min-h-48 rounded-xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newEventItemsEmpty")}
      </p>
    );
  }

  return (
    <ul className={GRID_CLASS}>
      {events.map(({ event, equipment }, index) => {
        const tile = tiles[index] ?? SMALL_TILE;

        return (
          <li key={event.slug} className={cn("min-w-0", tile.span)}>
            <EventBentoTile
              event={event}
              equipment={equipment}
              itemLimit={tile.itemLimit}
            />
          </li>
        );
      })}
    </ul>
  );
}
