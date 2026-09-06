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
  const partialDates = new Set(
    data.filter((point) => point.partial).map((point) => point.date),
  );
  return (
    <SectionCard>
      <SectionCardHeader title={title} />
      <SectionCardContent>
        <div className="h-56 min-w-0" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} accessibilityLayer>
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => date.slice(5)}
                minTickGap={36}
                tick={{ fontSize: 11 }}
              />
              <YAxis width={42} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
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
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer py-2">
            {t("statistics.showTable")}
          </summary>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>{t("statistics.date")}</th>
                  <th>{t("statistics.kills")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((day) => (
                  <tr key={day.date}>
                    <th className="py-1 font-normal">{day.date}</th>
                    <td>
                      {day.kills?.toLocaleString("pl-PL") ??
                        t("statistics.unknown")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </SectionCardContent>
    </SectionCard>
  );
}
