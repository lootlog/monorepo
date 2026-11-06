import { orderBy, uniqBy } from "es-toolkit";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { HOME_EVENTS_SHOWN, useLatestEvents } from "@/hooks/use-latest-events";
import { t } from "@/i18n/messages";
import { monsterIdentity } from "@/lib/group-items-by-monster";
import { eventSubtitle } from "@/lib/item-events";
import { NewItemsCard } from "./new-items-card";
import { NewItemsCardsSkeleton } from "./new-items-cards-skeleton";

/** The event's strongest monster, which pictures it. */
const eventBoss = (items: readonly CatalogItemDtoOutput[]) =>
  orderBy(
    uniqBy(
      items.flatMap(({ droppedBy }) => droppedBy),
      monsterIdentity,
    ),
    [({ lvl }) => lvl ?? 0],
    ["desc"],
  )[0];

/** The newest items of the latest events, under each event's name. */
export function NewEventItems() {
  const { data: events, isError } = useLatestEvents(HOME_EVENTS_SHOWN);

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!events) return <NewItemsCardsSkeleton count={HOME_EVENTS_SHOWN} />;

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newEventItemsEmpty")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {events.map(({ name, items }) => {
        const boss = eventBoss(items);

        return (
          <li key={name}>
            <NewItemsCard
              title={name}
              eyebrow={eventSubtitle(name, boss)}
              media={<NpcPortrait icon={boss?.icon} size="md" />}
              link={{
                to: "/events/$eventSlug",
                params: { eventSlug: itemEventSlug(name) },
              }}
              items={items}
              itemCount={items.length}
            />
          </li>
        );
      })}
    </ul>
  );
}
