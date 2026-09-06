import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { KillAnalyticsTrend } from "./kill-analytics-trend";

export function StatisticsWorlds({
  data,
  onClearWorld,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
  onClearWorld: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.worlds")}
          description={t("statistics.alignedComparison")}
          actions={
            data.meta.world ? (
              <Button variant="outline" onClick={onClearWorld}>
                {t("statistics.clearWorld")}
              </Button>
            ) : undefined
          }
        />
        <SectionCardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "world",
                    "kills",
                    "current",
                    "previous",
                    "change",
                    "share",
                  ].map((key) => (
                    <th key={key} className="pb-2">
                      {t(`statistics.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.worlds.map((world) => (
                  <tr key={world.world} className="border-t border-border/50">
                    <th scope="row" className="py-3 font-medium">
                      {world.world}
                    </th>
                    <td>{world.totalKills.toLocaleString("pl-PL")}</td>
                    <td>{world.comparisonKills.toLocaleString("pl-PL")}</td>
                    <td>{world.previousKills.toLocaleString("pl-PL")}</td>
                    <td>
                      {world.deltaKills.toLocaleString("pl-PL")} ·{" "}
                      {world.deltaPercent === null
                        ? "—"
                        : `${world.deltaPercent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`}
                    </td>
                    <td>
                      {world.share.toLocaleString("pl-PL", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCardContent>
      </SectionCard>
      <div className="grid gap-3 xl:grid-cols-2">
        {data.worlds.map((world) => (
          <KillAnalyticsTrend
            key={world.world}
            title={world.world}
            data={world.daily}
          />
        ))}
      </div>
    </>
  );
}
