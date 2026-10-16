import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { StatisticsOverview } from "./statistics-overview";
import { StatisticsActivity } from "./statistics-activity";
import { StatisticsMonsters } from "./statistics-monsters";
import type { StatisticsSearch, StatisticsTab } from "./statistics-search";

export type StatisticsTabProps = {
  data: UserKillAnalyticsResponseDtoOutput;
  search: StatisticsSearch;
};

const tabs = {
  overview: StatisticsOverview,
  activity: StatisticsActivity,
  monsters: StatisticsMonsters,
};

/** A kill statistics tab; loots read their own statistics. */
export function StatisticsContent({
  tab,
  ...props
}: StatisticsTabProps & { tab: Exclude<StatisticsTab, "loots" | "legends"> }) {
  const { t } = useTranslation();
  const Content = tabs[tab];

  if (props.data.meta.coverage === "unavailable")
    return (
      <EmptyState framed icon={BarChart3} title={t("statistics.unknown")} />
    );

  return <Content {...props} />;
}
