import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { EmptyState } from "@/components/common/empty-state";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { CircleAlert, RotateCcw, Skull } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { KillHistoryEntry } from "@lootlog/client/main";
import { createEventKillsTableColumns } from "./event-kills-table-columns";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { EventHistoryResults } from "../shared/event-history-results";
import { EventKillRowsSkeleton } from "./event-kill-rows-skeleton";
import { EventKillTiles } from "./event-kill-tiles";

type EventKillsTableBaseProps = {
  eventId: string;
  guildId: string;
  hasError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  isRetrying?: boolean;
  kills: KillHistoryEntry[];
};

type EventKillsTableHistoryProps = EventKillsTableBaseProps & {
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  resetKey: string;
  scrollElement: HTMLDivElement | null;
  variant?: "history";
};

type EventKillsTablePreviewProps = EventKillsTableBaseProps & {
  variant: "preview";
};

type EventKillsTableProps =
  | EventKillsTableHistoryProps
  | EventKillsTablePreviewProps;

const getColumnClassName = (columnId: string, isPreview: boolean) => {
  if (columnId === "killNumber") {
    return "w-12";
  }

  if (columnId === "monster") {
    return "min-w-0";
  }

  if (columnId === "date") {
    if (isPreview) {
      return "hidden w-0";
    }

    return "hidden w-0 sm:table-cell sm:w-28 lg:w-36";
  }

  // The preview card is narrow at every viewport, so its columns follow the
  // card width instead of the screen.
  if (columnId === "respawnTime") {
    if (isPreview) {
      return "hidden w-0 text-right @md/kills:table-cell @md/kills:w-32";
    }

    return "hidden w-0 text-right xl:table-cell xl:w-32";
  }

  if (columnId === "participants") {
    if (isPreview) {
      return "hidden w-0 text-right @xs/kills:table-cell @xs/kills:w-28";
    }

    return "hidden w-0 text-right lg:table-cell lg:w-28";
  }

  return "";
};

/**
 * The event's kills: the whole history, edge to edge on its page and as tiles
 * where the table would not fit, or the latest few in the event's preview card.
 */
export const EventKillsTable = (props: EventKillsTableProps) => {
  const { t } = useTranslation();
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  const { eventId, guildId, hasError, isLoading, kills, onRetry, isRetrying } =
    props;

  const isPreview = props.variant === "preview";

  const columns = createEventKillsTableColumns({
    eventId,
    guildId,
    isPreview,
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: kills,
  });

  const killsTable = (
    <Table
      className={cn(
        "w-full table-auto xl:table-fixed",
        !isPreview && "border-b",
      )}
    >
      <TanStackTableHeader
        table={table}
        className={FILTERED_TABLE_HEADER_CLASS}
        rowClassName="border-b-1! border-border hover:bg-transparent"
        getHeadClassName={(header) =>
          cn(
            "whitespace-nowrap align-middle",
            getColumnClassName(header.column.id, isPreview),
          )
        }
      />
      <TanStackTableBody
        table={table}
        rowClassName="h-14 border-b border-border hover:bg-muted/40"
        getCellClassName={(cell) =>
          cn(
            "h-14 overflow-hidden align-middle",
            getColumnClassName(cell.column.id, isPreview),
          )
        }
      />
      {/* A failed refresh keeps the last kills; the notice says they may be stale. */}
      {isPreview && hasError && (
        <TableBody>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns.length}>
              <QueryErrorNotice
                message={t("events.error")}
                onRetry={onRetry}
                isRetrying={isRetrying}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      )}
    </Table>
  );

  if (props.variant !== "preview") {
    return (
      <EventHistoryResults
        scrollElement={props.scrollElement}
        resetKey={props.resetKey}
        isEmpty={kills.length === 0}
        isLoading={isLoading}
        hasError={hasError}
        hasNextPage={props.hasNextPage}
        isFetchingNextPage={props.isFetchingNextPage}
        fetchNextPage={props.fetchNextPage}
        onRetry={onRetry}
        isRetrying={isRetrying}
        skeleton={<EventKillRowsSkeleton />}
      >
        {!usesTable ? (
          <EventKillTiles kills={kills} guildId={guildId} eventId={eventId} />
        ) : (
          killsTable
        )}
      </EventHistoryResults>
    );
  }

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div aria-busy="true" aria-label={t("events.kills.loading")}>
          <TableRowsSkeleton
            rows={5}
            trailingColumns={3}
            withHeader
            withNpcTile
          />
        </div>
      );
    }

    if (hasError && kills.length === 0) {
      return (
        <EmptyState
          icon={CircleAlert}
          title={t("events.error")}
          action={
            <Button
              type="button"
              variant="outline"
              loading={isRetrying ?? false}
              icon=<RotateCcw className="size-3.5" />
              onClick={onRetry}
            >
              {t("common.actions.retry")}
            </Button>
          }
        />
      );
    }

    if (kills.length === 0) {
      return <EmptyState icon={Skull} title={t("events.kills.noKills")} />;
    }

    return killsTable;
  };

  return (
    <section className="@container/kills w-full min-w-0 overflow-clip">
      {renderPreviewContent()}
    </section>
  );
};
