import {
  type CatalogEventDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { homeEventItemsParams } from "@/hooks/use-home-events";
import { eventSubtitle } from "@/lib/item-events";
import { NewItemsCard } from "./new-items-card";

type EventBentoTileProps = {
  event: CatalogEventDtoOutput;
  itemLimit: number;
};

export function EventBentoTile({ event, itemLimit }: EventBentoTileProps) {
  const { data } = useCatalogControllerGetItems(
    homeEventItemsParams(event.slug),
  );

  if (!data) return <Skeleton className="h-full min-h-48 rounded-xl" />;

  return (
    <NewItemsCard
      title={event.name}
      eyebrow={eventSubtitle(event.name, event.boss)}
      media={<NpcPortrait icon={event.boss?.icon} size="md" />}
      link={{
        to: "/events/$eventSlug",
        params: { eventSlug: event.slug },
      }}
      items={data.hits}
      itemCount={event.itemCount}
      itemLimit={itemLimit}
    />
  );
}
