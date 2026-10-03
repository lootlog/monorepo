import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ActivityHeatmap } from "@/components/common/activity-heatmap/activity-heatmap";
import { KpiCard } from "@/components/common/kpi-card";
import { Flame, Trophy } from "lucide-react";

import { StatisticsDistribution } from "./statistics-distribution";
import { summarizeActivityDistributions } from "./summarize-activity-distributions";

const weekdayFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  timeZone: "Europe/Warsaw",
});

export function StatisticsActivity({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  const distributions = summarizeActivityDistributions(data.hourlyWeekday);
  const max = Math.max(1, ...data.hourlyWeekday.map((cell) => cell.kills));

  const weekdays = Array.from({ length: 7 }, (_, day) =>
    weekdayFormatter.format(new Date(Date.UTC(2026, 0, 5 + day, 12))),
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={Flame}
          label={t("statistics.currentStreak")}
          value={t("statistics.days", { count: data.overview.currentStreak })}
        />
        <KpiCard
          icon={Trophy}
          label={t("statistics.longestStreak")}
          value={t("statistics.days", { count: data.overview.longestStreak })}
        />
      </div>
      <SectionCard>
        <SectionCardHeader title={t("statistics.activity")} />
        <SectionCardContent>
          <ActivityHeatmap
            days={data.daily.map((day) => ({
              date: day.date,
              value: day.kills,
              partial: day.partial,
            }))}
            label={t("statistics.activity")}
            formatValue={(value) => t("statistics.count", { count: value })}
          />
        </SectionCardContent>
      </SectionCard>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <StatisticsDistribution
          title={t("statistics.hourlyDistribution")}
          rows={distributions.hourly.map(({ hour, kills }) => ({
            label: `${String(hour).padStart(2, "0")}:00`,
            kills,
          }))}
        />
        <StatisticsDistribution
          title={t("statistics.weekdayDistribution")}
          rows={distributions.weekdays.map(({ weekday, kills }) => ({
            label: weekdayFormatter.format(
              new Date(Date.UTC(2026, 0, 4 + weekday, 12)),
            ),
            kills,
          }))}
        />
      </div>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.hours")}
          description={t("statistics.polishTime")}
        />
        <SectionCardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-1 text-center text-xs">
              <caption className="sr-only">{t("statistics.hours")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("statistics.weekday")}</th>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <th scope="col" key={hour}>
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekdays.map((weekday, index) => (
                  <tr key={weekday}>
                    <th scope="row" className="text-left font-normal">
                      {weekday}
                    </th>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value =
                        data.hourlyWeekday.find(
                          (cell) =>
                            cell.weekday === index + 1 && cell.hour === hour,
                        )?.kills ?? 0;

                      return (
                        <td
                          key={hour}
                          className="rounded-sm px-1 py-2 text-card-foreground tabular-nums"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--primary) ${Math.ceil((value / max) * 20)}%, var(--card))`,
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCardContent>
      </SectionCard>
    </>
  );
}
