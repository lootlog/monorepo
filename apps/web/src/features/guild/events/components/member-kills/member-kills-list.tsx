import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { AlertCircle, Skull } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
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
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { MemberKillBreakdownRow } from "./member-kill-breakdown-row";
import { createMemberKillsTableColumns } from "./member-kills-table-columns";

type MemberKillsListProps = {
  guildId: string;
  eventId: string;
  scrollElement: HTMLDivElement;
  resetKey: string;
  allKills: EventMemberKill[];
  isLoading: boolean;
  hasError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

const HEAD_TEXT_CLASS_NAME = "text-[10px] uppercase tracking-[0.08em]";

const HEAD_CLASS_NAMES = new Map([
  ["monster", `h-9 min-w-0 px-2 ${HEAD_TEXT_CLASS_NAME}`],
  [
    "date",
    `hidden h-9 w-0 px-2 ${HEAD_TEXT_CLASS_NAME} sm:table-cell sm:w-28 lg:w-36`,
  ],
  [
    "timeCoverage",
    `hidden h-9 w-0 px-2 text-right ${HEAD_TEXT_CLASS_NAME} xl:table-cell xl:w-28`,
  ],
  [
    "trackingTime",
    `hidden h-9 w-0 px-2 text-right ${HEAD_TEXT_CLASS_NAME} xl:table-cell xl:w-40`,
  ],
  ["points", `h-9 w-20 px-2 text-right ${HEAD_TEXT_CLASS_NAME} sm:w-24`],
  ["actions", "h-9 w-11 px-2"],
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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    scrollElement,
  });

  if (isLoading) {
    return (
      <div
        aria-label={t("events.kills.loading")}
        className="overflow-hidden rounded-2xl border border-border"
      >
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-14 w-full rounded-none border-t border-border/70"
          />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm">{t("events.error")}</p>
      </div>
    );
  }

  if (allKills.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Skull className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.kills.noKills")}</p>
      </div>
    );
  }

  return (
    <SectionCard className="w-full overflow-hidden">
      <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
      <Table className="w-full table-auto xl:table-fixed">
        <TanStackTableHeader
          table={table}
          className="bg-secondary/25"
          rowClassName="border-border/80 hover:bg-transparent"
          getHeadClassName={(header) =>
            HEAD_CLASS_NAMES.get(header.column.id) ?? ""
          }
        />
        <TanStackTableBody
          table={table}
          rowClassName="group h-14 hover:bg-muted/20"
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
              className="h-12 border-t border-border/70 text-center text-xs text-muted-foreground"
            >
              {hasNextPage ? (
                <span className="inline-flex items-center gap-2">
                  {isFetchingNextPage && (
                    <Spinner className="size-4 text-primary" />
                  )}
                  {t("events.kills.loading")}
                </span>
              ) : (
                t("events.kills.endOfList")
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </SectionCard>
  );
};
