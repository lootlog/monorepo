import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@lootlog/ui/components/table";
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
            <Table className="min-w-[450px]">
              <TableHeader>
                <TableRow>
                  {[
                    "world",
                    "kills",
                    "current",
                    "previous",
                    "change",
                    "share",
                  ].map((key) => (
                    <TableHead key={key} scope="col">
                      {t(`statistics.${key}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.worlds.map((world) => (
                  <TableRow key={world.world}>
                    <TableCell
                      as="th"
                      scope="row"
                      className="text-left font-medium"
                    >
                      {world.world}
                    </TableCell>
                    <TableCell>
                      {world.totalKills.toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      {world.comparisonKills.toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      {world.previousKills.toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      {world.deltaKills.toLocaleString("pl-PL")} ·{" "}
                      {world.deltaPercent === null
                        ? "—"
                        : `${world.deltaPercent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`}
                    </TableCell>
                    <TableCell>
                      {world.share.toLocaleString("pl-PL", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
