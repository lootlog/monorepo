import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { StatisticsOverview } from "./statistics-overview";
import { StatisticsActivity } from "./statistics-activity";
import { StatisticsMonsters } from "./statistics-monsters";
import { StatisticsWorlds } from "./statistics-worlds";
import type { StatisticsTab } from "./statistics-search";

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
      {!hasHistory && (
        <p className="p-3 text-sm text-muted-foreground">
          {t("statistics.unknown")}
        </p>
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
