import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { cn } from "cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { EventHistoryResults } from "../shared/event-history-results";
import { MemberKillBreakdownRow } from "./member-kill-breakdown-row";
import { MemberKillRowsSkeleton } from "./member-kill-rows-skeleton";
import { MemberKillTiles } from "./member-kill-tiles";
import { createMemberKillsTableColumns } from "./member-kills-table-columns";
import { KillCellLink } from "../kills/kill-cell-link";

type MemberKillsListProps = {
  guildId: string;
  eventId: string;
  scrollElement: HTMLDivElement | null;
  resetKey: string;
  allKills: KillHistoryMemberEntry[];
  isLoading: boolean;
  hasError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onRetry: () => void;
  isRetrying?: boolean;
};

const HEAD_CLASS_NAMES = new Map([
  ["killNumber", "w-12"],
  ["monster", "min-w-0"],
  ["date", "hidden w-0 sm:table-cell sm:w-28 lg:w-36"],
  ["timeCoverage", "hidden w-0 text-right xl:table-cell xl:w-28"],
  ["trackingTime", "hidden w-0 text-right xl:table-cell xl:w-40"],
  ["points", "w-20 text-right sm:w-24"],
  ["actions", "w-11"],
]);

const RIGHT_ALIGNED_COLUMN_IDS = new Set([
  "timeCoverage",
  "trackingTime",
  "points",
]);

const CELL_CLASS_NAMES = new Map([
  ["killNumber", "w-12 py-0"],
  ["monster", "min-w-0 overflow-hidden py-1.5"],
  ["date", "hidden w-0 py-0 sm:table-cell sm:w-28 lg:w-36"],
  [
    "timeCoverage",
    "hidden w-0 py-0 text-right font-medium tabular-nums xl:table-cell xl:w-28",
  ],
  [
    "trackingTime",
    "hidden w-0 py-0 text-right tabular-nums xl:table-cell xl:w-40",
  ],
  ["points", "w-20 py-0 text-right sm:w-24"],
  ["actions", "w-11 py-0 text-right"],
]);

// Initial query loading/error and next-page availability/fetching are independent query states, not mutually exclusive presentation variants.
// eslint-disable-next-line react-doctor/no-many-boolean-props
export const MemberKillsList = ({
  guildId,
  eventId,
  scrollElement,
  resetKey,
  allKills,
  isLoading,
  hasError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onRetry,
  isRetrying,
}: MemberKillsListProps) => {
  const { t } = useTranslation();
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  // Expanded breakdowns belong to one filtered list, so a new reset key starts collapsed.
  const [expanded, setExpanded] = useState<{
    resetKey: string;
    killIds: readonly string[];
  }>({ resetKey, killIds: [] });

  const expandedKillIds =
    expanded.resetKey === resetKey ? expanded.killIds : [];

  const toggleExpanded = (killId: string) =>
    setExpanded({
      resetKey,
      killIds: expandedKillIds.includes(killId)
        ? expandedKillIds.filter((expandedKillId) => expandedKillId !== killId)
        : [...expandedKillIds, killId],
    });

  const columns = createMemberKillsTableColumns({
    eventId,
    expandedKillIds,
    guildId,
    onExpandedToggle: toggleExpanded,
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: allKills,
    getRowId: (kill) => kill.id,
  });

  return (
    <EventHistoryResults
      scrollElement={scrollElement}
      resetKey={resetKey}
      isEmpty={allKills.length === 0}
      isLoading={isLoading}
      hasError={hasError}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      onRetry={onRetry}
      isRetrying={isRetrying}
      skeleton={<MemberKillRowsSkeleton />}
    >
      {!usesTable ? (
        <MemberKillTiles
          kills={allKills}
          guildId={guildId}
          eventId={eventId}
          expandedKillIds={expandedKillIds}
          onExpandedToggle={toggleExpanded}
        />
      ) : (
        <Table className="w-full table-auto border-b xl:table-fixed">
          <TanStackTableHeader
            table={table}
            className={FILTERED_TABLE_HEADER_CLASS}
            rowClassName="border-b-1! border-border hover:bg-transparent"
            getHeadClassName={(header) =>
              cn(
                "whitespace-nowrap align-middle",
                HEAD_CLASS_NAMES.get(header.column.id),
              )
            }
          />
          <TanStackTableBody
            table={table}
            rowClassName="h-14 border-b border-border hover:bg-muted/40"
            getCellClassName={(cell) =>
              cn(
                CELL_CLASS_NAMES.get(cell.column.id),
                cell.column.id !== "actions" && "p-0!",
              )
            }
            // The whole row opens the kill; the breakdown toggle stays its own
            // control, and only the first cell takes focus.
            renderCellContent={(cell, content) =>
              cell.column.id === "actions" ? (
                content
              ) : (
                <KillCellLink
                  guildId={guildId}
                  eventId={eventId}
                  kill={cell.row.original}
                  primary={cell.column.id === "monster"}
                  className={cn(
                    cell.column.id === columns[0]?.id && "pl-4",
                    RIGHT_ALIGNED_COLUMN_IDS.has(cell.column.id) &&
                      "justify-end",
                  )}
                >
                  {content}
                </KillCellLink>
              )
            }
            getRowProps={(row) => ({
              "data-state": expandedKillIds.includes(row.id)
                ? "selected"
                : undefined,
            })}
            renderRowDetail={(row) =>
              expandedKillIds.includes(row.id) && (
                <MemberKillBreakdownRow
                  columnCount={columns.length}
                  kill={row.original}
                />
              )
            }
          />
        </Table>
      )}
    </EventHistoryResults>
  );
};
