import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { KillAnalyticsTrend } from "./kill-analytics-trend";

export function StatisticsOverview({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  const metrics = {
    total: data.overview.totalKills,
    activeDays: data.overview.activeDays,
    average: data.overview.activeDays
      ? data.overview.totalKills / data.overview.activeDays
      : null,
    uniqueNpcs: data.overview.uniqueNpcs,
  };
  return (
    <>
      <SectionCard>
        <SectionCardHeader title={t("statistics.overview")} />
        <SectionCardContent>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">
                  {t(`statistics.${key}`)}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {value?.toLocaleString("pl-PL", {
                    maximumFractionDigits: 1,
                  }) ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCardContent>
      </SectionCard>
      <div className="grid gap-3 xl:grid-cols-2">
        <KillAnalyticsTrend title={t("statistics.daily")} data={data.daily} />
        <KillAnalyticsTrend
          title={t("statistics.weekly")}
          data={data.weekly.map((week) => ({
            date: week.startDate,
            kills: week.kills,
            partial: week.partial,
          }))}
        />
      </div>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.comparison")}
          description={t("statistics.alignedComparison")}
        />
        <SectionCardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { key: "current", value: data.comparison.currentKills },
              { key: "previous", value: data.comparison.previousKills },
              { key: "change", value: data.comparison.deltaKills },
            ].map(({ key, value }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">
                  {t(`statistics.${key}`)}
                </dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {value.toLocaleString("pl-PL")}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("statistics.change")} %
              </dt>
              <dd className="text-xl font-semibold">
                {data.comparison.deltaPercent === null
                  ? "—"
                  : `${data.comparison.deltaPercent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`}
              </dd>
            </div>
          </dl>
          {data.comparison.partial && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("statistics.partial")}
            </p>
          )}
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader title={t("statistics.records")} />
        <SectionCardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            {Object.entries(data.records).map(([key, record]) => (
              <div key={key}>
                <dt className="text-sm text-muted-foreground">
                  {t(`statistics.${key}`)}
                </dt>
                <dd className="text-xl font-semibold">
                  {record?.kills.toLocaleString("pl-PL") ?? "—"}
                </dd>
                {record && (
                  <p className="text-xs text-muted-foreground">
                    {record.startDate} – {record.endDate}
                    {record.partial && ` · ${t("statistics.partial")}`}
                  </p>
                )}
              </div>
            ))}
          </dl>
        </SectionCardContent>
      </SectionCard>
    </>
  );
}
