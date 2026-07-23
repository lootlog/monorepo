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
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@lootlog/ui/lib/utils";
import { Fragment, type ReactNode, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DamageBreakdown } from "./damage-breakdown";
import { LegendaryBonusesBreakdown } from "./legendary-bonuses-breakdown";
import { TurnsBreakdown } from "./turns-breakdown";
import { BlocksBreakdown } from "./blocks-breakdown";
import { WarriorDetailsBreakdown } from "./warrior-details-breakdown";
import { DamageDealtBreakdown } from "./damage-dealt-breakdown";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type ExpandedRowType =
  | "damage"
  | "legendary"
  | "turns"
  | "blocks"
  | "details"
  | "damageDealt";

interface ExpandableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowClassName?: (row: Row<TData>) => string;
  forceHorizontalScroll?: boolean;
  expandedRows: Map<string, ExpandedRowType>;
}

const renderSortIcon = (sortDirection: false | "asc" | "desc"): ReactNode => {
  if (sortDirection === "asc") {
    return <ArrowUp className="h-4 w-4" />;
  }

  if (sortDirection === "desc") {
    return <ArrowDown className="h-4 w-4" />;
  }

  return <ArrowUpDown className="h-4 w-4 opacity-50" />;
};

const renderExpandedContent = (
  expansionType: ExpandedRowType,
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

export function ExpandableDataTable<TData, TValue>({
  columns,
  data,
  getRowClassName,
  forceHorizontalScroll = false,
  expandedRows,
}: ExpandableDataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="max-w-full w-full">
      <div className="overflow-x-auto">
        <Table className={forceHorizontalScroll ? "min-w-[2000px]" : ""}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();
                  let headerContent: ReactNode = null;

                  if (!header.isPlaceholder && canSort) {
                    headerContent = (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 cursor-pointer select-none hover:bg-gray-400/10 p-2 -m-2 rounded text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <span className="ml-auto">
                          {renderSortIcon(sortDirection)}
                        </span>
                      </button>
                    );
                  } else if (!header.isPlaceholder) {
                    headerContent = (
                      <div className={cn("flex items-center gap-2")}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    );
                  }

                  return <TableHead key={header.id}>{headerContent}</TableHead>;
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const warrior = row.original as Warrior;
                const expansionType = expandedRows.get(warrior.id);

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                        getRowClassName ? getRowClassName(row) : undefined,
                      )}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    <AnimatePresence>
                      {expansionType ? (
                        <motion.tr
                          key={`${row.id}-expanded`}
                          layout
                          className="hover:bg-secondary border-b bg-secondary transition-colors"
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
                            <motion.div
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
                                <motion.div
                                  key={`${warrior.id}-${expansionType}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                  }}
                                >
                                  {renderExpandedContent(
                                    expansionType,
                                    warrior,
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            </motion.div>
                          </TableCell>
                        </motion.tr>
                      ) : null}
                    </AnimatePresence>
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("battleUi.statsTable.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
