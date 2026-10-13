import { ChartCard } from "@/components/common/chart-card";
import { FilterBar } from "@/components/common/filter-bar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { CombatProfileOverview } from "./components/combat-profile-overview";

const FILTER_WIDTHS = ["md:w-52", "md:w-60", "md:w-44", "md:w-40"];

// The loaded cards are `ChartCard`s with static titles, so their own loading
// state is the skeleton.
export const BattlePanelStatisticsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full min-h-0 pt-3">
      <div
        aria-busy="true"
        className="flex min-h-full flex-col gap-3 px-3 pb-3"
      >
        <FilterBar ariaLabel={t("battlePanel.filters.title")}>
          {FILTER_WIDTHS.map((width, index) => (
            <Skeleton
              key={width}
              className={`h-10 w-full rounded-md ${width} ${index > 0 ? "hidden md:block" : ""}`}
            />
          ))}
        </FilterBar>

        <CombatProfileOverview data={undefined} isLoading />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          <ChartCard
            title={t("battlePanel.statistics.currentStreak.title")}
            description={t("battlePanel.statistics.currentStreak.description")}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.battleDuration.title")}
            description={t("battlePanel.statistics.battleDuration.description")}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.phGrowth.title")}
            description={t("battlePanel.statistics.phGrowth.description")}
            isLoading
            className="lg:col-span-2"
          >
            {null}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <ChartCard
            title={t("battlePanel.statistics.professionWinRate.title")}
            description={t(
              "battlePanel.statistics.professionWinRate.description",
            )}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.directMatchups.title")}
            description={t("battlePanel.statistics.directMatchups.description")}
            isLoading
            actions={
              // Reserves the width of the link to the full record.
              <span className="flex h-8 items-center">
                <Skeleton className="h-3 w-20" />
              </span>
            }
          >
            {null}
          </ChartCard>
        </div>
      </div>
    </ScrollArea>
  );
};
