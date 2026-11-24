import type {
  CatalogEventDtoOutput,
  CatalogItemsResponseDtoOutput,
} from "@lootlog/client/catalog";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { eventSubtitle } from "@/lib/item-events";
import { NewItemsCard } from "./new-items-card";

type EventBentoTileProps = {
  event: CatalogEventDtoOutput;
  equipment: CatalogItemsResponseDtoOutput;
  itemLimit: number;
};

export function EventBentoTile({
  event,
  equipment,
  itemLimit,
}: EventBentoTileProps) {
  return (
    <NewItemsCard
      title={event.name}
      eyebrow={eventSubtitle(event.name, event.boss)}
      media={<NpcPortrait icon={event.boss?.icon} size="md" />}
      link={{
        to: "/events/$eventSlug",
        params: { eventSlug: event.slug },
      }}
      items={equipment.hits}
      itemCount={equipment.estimatedTotalHits}
      itemLimit={itemLimit}
    />
  );
}
