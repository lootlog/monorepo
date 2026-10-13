import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { orderBy } from "es-toolkit";
// eslint-disable-next-line react-doctor/prefer-dynamic-import -- This chart implementation is loaded only by its lazy wrapper; Recharts stays inside that async boundary.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import {
  formatStatisticsDate,
  formatStatisticsDateHour,
  formatStatisticsDay,
  formatStatisticsHour,
} from "./format-statistics-date";

type KillAnalyticsTrendPoint = {
  date: string;
  kills: number | null;
  partial?: boolean;
};

type KillAnalyticsTrendProps = {
  title: string;
  description?: string;
  data: KillAnalyticsTrendPoint[];
  /** "day" points are calendar dates; "hour" points are instants. */
  granularity?: "day" | "hour";
};

export function KillAnalyticsTrend({
  title,
  description,
  data,
  granularity = "day",
}: KillAnalyticsTrendProps) {
  const { t } = useTranslation();

  const [formatLabel, formatTick] =
    granularity === "hour"
      ? [formatStatisticsDateHour, formatStatisticsHour]
      : [formatStatisticsDate, formatStatisticsDay];

  const [view, setView] = useState<"chart" | "table">("chart");

  const partialDates = new Set(
    data.flatMap((point) => (point.partial ? [point.date] : [])),
  );

  const columns: ColumnDef<
    typeof coreTableFeatures,
    KillAnalyticsTrendPoint
  >[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <SortableColumnHeader column={column} align="start">
          {t("statistics.date")}
        </SortableColumnHeader>
      ),
      cell: ({ row: { original: day } }) => (
        <>
          {formatLabel(day.date)}
          {day.partial && (
            <span className="ml-2 text-xs text-muted-foreground">
              {t("statistics.partial")}
            </span>
          )}
        </>
      ),
    },
    {
      accessorKey: "kills",
      header: ({ column }) => (
        <SortableColumnHeader column={column} align="end">
          {t("statistics.kills")}
        </SortableColumnHeader>
      ),
      cell: ({ row: { original: day } }) =>
        day.kills?.toLocaleString("pl-PL") ?? t("statistics.unknown"),
    },
  ];

  // The newest day comes first; the chart keeps time running left to right.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const sort = sorting[0] ?? { id: "date", desc: true };

  const direction = sort.desc ? "desc" : "asc";

  // By kills, days without data stay last in both directions.
  const rows =
    sort.id === "kills"
      ? orderBy(
          data,
          [(day) => day.kills === null, (day) => day.kills ?? 0],
          ["asc", direction],
        )
      : orderBy(data, [(day) => day.date], [direction]);

  const table = useTable({
    features: coreTableFeatures,
    data: rows,
    columns,
    getRowId: (day) => day.date,
    manualSorting: true,
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <SectionCard>
      <SectionCardHeader
        title={title}
        description={description}
        actions=<AnimatedToggleGroup
          size="sm"
          label={t("statistics.view")}
          value={view}
          onValueChange={setView}
          options={[
            { value: "chart", label: t("statistics.chart") },
            { value: "table", label: t("statistics.table") },
          ]}
        />
      />
      <SectionCardContent className={view === "table" ? "p-0" : undefined}>
        {view === "chart" ? (
          <div className="h-64 min-w-0" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} accessibilityLayer>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTick}
                  minTickGap={36}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--primary)", fillOpacity: 0.12 }}
                  labelFormatter={(date) =>
                    `${formatLabel(String(date))}${partialDates.has(String(date)) ? ` · ${t("statistics.partial")}` : ""}`
                  }
                  contentStyle={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    borderColor: "var(--border)",
                  }}
                />
                <Bar
                  dataKey="kills"
                  name={t("statistics.kills")}
                  fill="var(--primary)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <Table aria-label={title}>
              <TanStackTableHeader
                table={table}
                className="sticky top-0 z-10 bg-background"
                rowClassName="border-b-1! border-border"
                getHeadClassName={(header) =>
                  header.column.id === "kills" ? "text-right" : ""
                }
              />
              <TanStackTableBody
                table={table}
                rowHeaderColumnId="date"
                rowClassName="h-14 border-b border-border hover:bg-muted/40"
                getCellClassName={(cell) =>
                  cell.column.id === "kills"
                    ? "text-right font-medium tabular-nums"
                    : "tabular-nums"
                }
              />
            </Table>
          </ScrollArea>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
