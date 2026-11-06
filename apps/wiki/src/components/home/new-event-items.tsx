import { groupBy, orderBy, uniqBy } from "es-toolkit";
import {
  type CatalogItemDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/search";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { monsterIdentity } from "@/lib/group-items-by-monster";
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
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {events.map(([event, items]) => {
        const boss = eventBoss(items);

        return (
          <li key={event}>
            <NewItemsCard
              title={event}
              eyebrow={
                boss
                  ? t("home.eventBoss", { name: boss.name })
                  : t("home.eventEyebrow")
              }
              media={<NpcPortrait icon={boss?.icon} size="md" />}
              link={{
                to: "/events/$eventSlug",
                params: { eventSlug: itemEventSlug(event) },
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
