import { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@lootlog/ui/components/table";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
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

type KillAnalyticsTrendProps = {
  title: string;
  data: { date: string; kills: number | null; partial?: boolean }[];
};
export function KillAnalyticsTrend({ title, data }: KillAnalyticsTrendProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<"chart" | "table">("chart");
  const partialDates = new Set(
    data.filter((point) => point.partial).map((point) => point.date),
  );
  return (
    <SectionCard>
      <SectionCardHeader
        title={title}
        actions={
          <AnimatedToggleGroup
            label={t("statistics.view")}
            value={view}
            onValueChange={setView}
            options={[
              { value: "chart", label: t("statistics.chart") },
              { value: "table", label: t("statistics.table") },
            ]}
          />
        }
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
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead scope="col">{t("statistics.date")}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t("statistics.kills")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell
                      as="th"
                      scope="row"
                      className="text-left font-normal tabular-nums"
                    >
                      {day.date}
                      {day.partial && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t("statistics.partial")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {day.kills?.toLocaleString("pl-PL") ??
                        t("statistics.unknown")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
