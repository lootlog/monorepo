import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { StatisticsOverview } from "./statistics-overview";
import { StatisticsActivity } from "./statistics-activity";
import { StatisticsMonsters } from "./statistics-monsters";
import { StatisticsWorlds } from "./statistics-worlds";
import type { StatisticsTab } from "./statistics-search";

const coverageDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  dateStyle: "medium",
});
const tabs = {
  overview: StatisticsOverview,
  activity: StatisticsActivity,
  monsters: StatisticsMonsters,
  worlds: StatisticsWorlds,
};

export function StatisticsContent({
  data,
  tab,
  onClearWorld,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
  tab: StatisticsTab;
  onClearWorld: () => void;
}) {
  const { t } = useTranslation();
  const Content = tabs[tab];
  const hasHistory = data.meta.coverage !== "unavailable";
  return (
    <>
      {data.meta.coverage !== "complete" && (
        <div
          role="status"
          className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground"
        >
          <p>{t("statistics.partialHistory")}</p>
          {data.meta.firstBucketAt && (
            <p className="mt-1 text-xs">
              {t("statistics.coverage", {
                date: coverageDateFormatter.format(
                  new Date(data.meta.firstBucketAt),
                ),
                count: data.meta.untimedKills,
              })}
            </p>
          )}
        </div>
      )}
      {hasHistory && (
        <>
          {data.overview.totalKills === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              {t("statistics.noData")}
            </p>
          )}
          <Content data={data} onClearWorld={onClearWorld} />
        </>
      )}
    </>
  );
}
