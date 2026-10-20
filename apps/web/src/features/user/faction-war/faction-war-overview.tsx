import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";
import { FactionWarContribution } from "./faction-war-contribution";
import { FactionWarDailyChart } from "./faction-war-daily-chart";
import { FactionWarLayout } from "./faction-war-layout";
import { FactionWarPrivacy } from "./faction-war-privacy";
import { FactionWarRules } from "./faction-war-rules";
import { getFactionWarDailyRows } from "./faction-war-standings";

/** The war at a glance: the caller's part, the daily scores and the rules. */
export const FactionWarOverview = () => {
  const { t } = useTranslation();

  return (
    <FactionWarLayout tab="overview">
      {(war) => {
        const rows = getFactionWarDailyRows(war.days);

        return (
          <>
            <FactionWarContribution war={war} />
            <ChartSection
              title={t("factionWar.chart.title")}
              description={t("factionWar.chart.description")}
              emptyMessage={
                rows.length === 0 ? t("factionWar.chart.empty") : undefined
              }
            >
              <FactionWarDailyChart rows={rows} />
            </ChartSection>
            <FactionWarPrivacy war={war} />
            <FactionWarRules scoring={war.scoring} />
          </>
        );
      }}
    </FactionWarLayout>
  );
};
