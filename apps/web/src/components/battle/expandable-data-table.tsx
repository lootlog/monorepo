import { ROW_ENTRANCE_CLASS_NAME } from "@/components/ui/row-entrance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  flexRender,
  type ColumnDef,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import { Fragment, type ReactNode, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { DamageBreakdown } from "./damage-breakdown";
import { LegendaryBonusesBreakdown } from "./legendary-bonuses-breakdown";
import { TurnsBreakdown } from "./turns-breakdown";
import { BlocksBreakdown } from "./blocks-breakdown";
import { WarriorDetailsBreakdown } from "./warrior-details-breakdown";
import { DamageDealtBreakdown } from "./damage-dealt-breakdown";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { sortedTableFeatures } from "@/lib/tanstack-table-features";
import type { BattleStatsExpansionType } from "./battle-stats-table-columns-full";

interface ExpandableDataTableProps<TData extends Warrior> {
  columns: ColumnDef<typeof sortedTableFeatures, TData>[];
  data: TData[];
  getTeamClassName?: (warrior: TData) => string;
  expandedRows: Map<string, BattleStatsExpansionType>;
}

const renderSortIcon = (sortDirection: false | "asc" | "desc"): ReactNode => {
  if (sortDirection === "asc") {
    return <ArrowUp className="size-3 shrink-0" aria-hidden />;
  }

  if (sortDirection === "desc") {
    return <ArrowDown className="size-3 shrink-0" aria-hidden />;
  }

  // Ten columns share a narrow panel, so an unsorted column spends no width on an icon.
  return null;
};

const ARIA_SORT_BY_DIRECTION = {
  asc: "ascending",
  desc: "descending",
} as const;

const renderExpandedContent = (
  expansionType: BattleStatsExpansionType,
  warrior: Warrior,
): ReactNode => {
  switch (expansionType) {
    case "damage":
      return <DamageBreakdown warrior={warrior} />;
    case "legendary":
      return <LegendaryBonusesBreakdown warrior={warrior} />;
    case "turns":
      return <TurnsBreakdown warrior={warrior} />;
    case "blocks":
      return <BlocksBreakdown warrior={warrior} />;
    case "details":
      return <WarriorDetailsBreakdown warrior={warrior} />;
    case "damageDealt":
      return <DamageDealtBreakdown warrior={warrior} />;
  }
};

export function ExpandableDataTable<TData extends Warrior>({
  columns,
  data,
  getTeamClassName,
  expandedRows,
}: ExpandableDataTableProps<TData>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useTable({
    features: sortedTableFeatures,
    data,
    columns,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <Table className="min-w-[700px] text-[13px]">
      <TableHeader className="sticky top-0 z-20 bg-muted">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header, headerIndex) => {
              const canSort = header.column.getCanSort();
              const sortDirection = header.column.getIsSorted();
              let headerContent: ReactNode = null;

              if (!header.isPlaceholder && canSort) {
                headerContent = (
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer select-none items-center gap-1 rounded-sm px-1 py-1 leading-tight hover:bg-gray-400/10",
                      headerIndex === 0
                        ? "justify-start text-left"
                        : "justify-end text-right",
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {renderSortIcon(sortDirection)}
                  </button>
                );
              } else if (!header.isPlaceholder) {
                headerContent = (
                  <div className="flex items-center gap-2 px-1.5">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </div>
                );
              }

              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sortDirection
                      ? ARIA_SORT_BY_DIRECTION[sortDirection]
                      : undefined
                  }
                  className={cn(
                    "h-auto whitespace-normal px-0.5 py-1.5 align-bottom text-[11px]",
                    headerIndex === 0 &&
                      "sticky left-0 z-10 w-40 bg-muted align-middle",
                  )}
                >
                  {headerContent}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const warrior = row.original;
            const expansionType = expandedRows.get(warrior.id);

            return (
              <Fragment key={row.id}>
                <TableRow className={cn("group/row", ROW_ENTRANCE_CLASS_NAME)}>
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "h-10 px-0.5 py-0.5",
                        cellIndex === 0 && [
                          // Opaque equivalents of the row backgrounds, so scrolled cells never show through.
                          "sticky left-0 z-10 max-w-40 bg-card group-hover/row:bg-[color-mix(in_oklab,var(--accent)_35%,var(--card))]",
                          getTeamClassName?.(warrior),
                        ],
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                <AnimatePresence>
                  {expansionType ? (
                    <m.tr
                      key={`${row.id}-expanded`}
                      layout
                      data-state="expanded-detail"
                      className="border-b transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        layout: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      <TableCell
                        colSpan={columns.length}
                        className="p-0 overflow-hidden"
                      >
                        <m.div
                          initial={{ opacity: 0, scaleY: 0.96 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          exit={{ opacity: 0, scaleY: 0.96 }}
                          style={{ transformOrigin: "top" }}
                          transition={{
                            duration: 0.3,
                            ease: "easeInOut",
                          }}
                          layout
                        >
                          <AnimatePresence mode="wait">
                            <m.div
                              key={`${warrior.id}-${expansionType}`}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{
                                duration: 0.2,
                                ease: "easeInOut",
                              }}
                            >
                              {renderExpandedContent(expansionType, warrior)}
                            </m.div>
                          </AnimatePresence>
                        </m.div>
                      </TableCell>
                    </m.tr>
                  ) : null}
                </AnimatePresence>
              </Fragment>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              {t("battleUi.statsTable.empty")}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
