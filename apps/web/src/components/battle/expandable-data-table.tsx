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
import React, { useState } from "react";
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

interface ExpandableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowClassName?: (row: Row<TData>) => string;
  forceHorizontalScroll?: boolean;
  expandedRows: Map<
    string,
    "damage" | "legendary" | "turns" | "blocks" | "details" | "damageDealt"
  >;
}

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

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
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
                            {sortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <div className={cn("flex items-center gap-2")}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
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
                  <React.Fragment key={row.id}>
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
                      {expansionType && (
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
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
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
                                  {expansionType === "damage" && (
                                    <DamageBreakdown warrior={warrior} />
                                  )}
                                  {expansionType === "legendary" && (
                                    <LegendaryBonusesBreakdown
                                      warrior={warrior}
                                    />
                                  )}
                                  {expansionType === "turns" && (
                                    <TurnsBreakdown warrior={warrior} />
                                  )}
                                  {expansionType === "blocks" && (
                                    <BlocksBreakdown warrior={warrior} />
                                  )}
                                  {expansionType === "details" && (
                                    <WarriorDetailsBreakdown
                                      warrior={warrior}
                                    />
                                  )}
                                  {expansionType === "damageDealt" && (
                                    <DamageDealtBreakdown warrior={warrior} />
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            </motion.div>
                          </TableCell>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
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
