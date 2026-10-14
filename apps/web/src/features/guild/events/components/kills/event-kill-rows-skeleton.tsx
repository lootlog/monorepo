import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { EVENT_HISTORY_PAGE_SIZE } from "../shared/event-history-page-size";
import { EventKillTileSkeleton } from "./event-kill-tile-skeleton";

/** Stands in for a page of the event's kill history: table rows, or tiles on phones. */
export const EventKillRowsSkeleton = () => (
  <TableRowsSkeleton
    rows={EVENT_HISTORY_PAGE_SIZE}
    trailingColumns={3}
    withHeader
    withNpcTile
    mobileList={
      <CardListSkeleton
        rows={EVENT_HISTORY_PAGE_SIZE}
        card={<EventKillTileSkeleton />}
      />
    }
  />
);
