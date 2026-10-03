import { EmptyState } from "@/components/common/empty-state";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { CircleAlert, RotateCcw, Skull } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { useInfiniteScrollSentinel } from "@/hooks/utils/use-infinite-scroll-sentinel";
import { useResetScrollTop } from "@/hooks/utils/use-virtual-infinite-scroll";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { MemberKillBreakdownRow } from "./member-kill-breakdown-row";
import { createMemberKillsTableColumns } from "./member-kills-table-columns";
import { EventHistoryPaginationStatus } from "../shared/event-history-pagination-status";

type MemberKillsListProps = {
  guildId: string;
  eventId: string;
  scrollElement: HTMLDivElement;
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
  ["monster", "min-w-0"],
  ["date", "hidden w-0 sm:table-cell sm:w-28 lg:w-36"],
  ["timeCoverage", "hidden w-0 text-right xl:table-cell xl:w-28"],
  ["trackingTime", "hidden w-0 text-right xl:table-cell xl:w-40"],
  ["points", "w-20 text-right sm:w-24"],
  ["actions", "w-11"],
]);

const CELL_CLASS_NAMES = new Map([
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

  // Expanded breakdowns belong to one filtered list, so a new reset key starts collapsed.
  const [expanded, setExpanded] = useState<{
    resetKey: string;
    killIds: readonly string[];
  }>({ resetKey, killIds: [] });

  const expandedKillIds =
    expanded.resetKey === resetKey ? expanded.killIds : [];

  const columns = createMemberKillsTableColumns({
    eventId,
    expandedKillIds,
    guildId,
    onExpandedToggle: (killId) =>
      setExpanded({
        resetKey,
        killIds: expandedKillIds.includes(killId)
          ? expandedKillIds.filter(
              (expandedKillId) => expandedKillId !== killId,
            )
          : [...expandedKillIds, killId],
      }),
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: allKills,
    getRowId: (kill) => kill.id,
  });

  useResetScrollTop({
    getScrollElement: () => scrollElement,
    resetKey,
  });

  const loaderRowRef = useInfiniteScrollSentinel<HTMLTableRowElement>({
    enabled: !hasError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    scrollElement,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-busy="true" aria-label={t("events.kills.loading")}>
          <Skeleton className="h-10 w-full rounded-none border-b border-border" />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none border-b border-border last:border-b-0"
            />
          ))}
        </div>
      );
    }

    if (hasError && allKills.length === 0) {
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

    if (allKills.length === 0 && !hasNextPage) {
      return <EmptyState icon={Skull} title={t("events.kills.noKills")} />;
    }

    return (
      <Table className="w-full table-auto xl:table-fixed">
        <TanStackTableHeader
          table={table}
          className="sticky top-0 z-10 bg-background"
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
            CELL_CLASS_NAMES.get(cell.column.id) ?? ""
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
        <TableBody>
          <TableRow ref={loaderRowRef} className="hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              className="h-14 text-center text-xs text-muted-foreground"
            >
              <EventHistoryPaginationStatus
                hasError={hasError}
                hasNextPage={hasNextPage}
                isFetching={isRetrying ?? isFetchingNextPage}
                onRetry={onRetry}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  return (
    <SectionCard className="w-full overflow-hidden">
      <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
      {renderContent()}
    </SectionCard>
  );
};
