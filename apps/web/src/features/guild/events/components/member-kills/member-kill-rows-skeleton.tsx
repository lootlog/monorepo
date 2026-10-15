import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { EventKillTileSkeleton } from "../kills/event-kill-tile-skeleton";
import { EVENT_HISTORY_PAGE_SIZE } from "../shared/event-history-page-size";

/** Stands in for a page of the member's kills: table rows, or tiles on phones. */
export const MemberKillRowsSkeleton = () => (
  <TableRowsSkeleton
    rows={EVENT_HISTORY_PAGE_SIZE}
    withHeader
    withNpcTile
    rowContent="text"
    mobileList={
      <CardListSkeleton
        rows={EVENT_HISTORY_PAGE_SIZE}
        card={<EventKillTileSkeleton withAction />}
      />
    }
  />
);
