import { useState } from "react";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
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

type KillAnalyticsTrendPoint = {
  date: string;
  kills: number | null;
  partial?: boolean;
};

type KillAnalyticsTrendProps = {
  title: string;
  data: KillAnalyticsTrendPoint[];
};

export function KillAnalyticsTrend({ title, data }: KillAnalyticsTrendProps) {
  const { t } = useTranslation();
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
      header: () => t("statistics.date"),
      cell: ({ row: { original: day } }) => (
        <>
          {day.date}
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
      header: () => t("statistics.kills"),
      cell: ({ row: { original: day } }) =>
        day.kills?.toLocaleString("pl-PL") ?? t("statistics.unknown"),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data,
    columns,
    getRowId: (day) => day.date,
  });

  return (
    <SectionCard>
      <SectionCardHeader
        title={title}
        actions=<AnimatedToggleGroup
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
                  tickFormatter={(date: string) => date.slice(5)}
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
                    `${date}${partialDates.has(String(date)) ? ` · ${t("statistics.partial")}` : ""}`
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
                getHeadClassName={(header) =>
                  header.column.id === "kills" ? "text-right" : ""
                }
              />
              <TanStackTableBody
                table={table}
                rowHeaderColumnId="date"
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
