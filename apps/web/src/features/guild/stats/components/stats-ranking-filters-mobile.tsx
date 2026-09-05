import { StatsWorldPeriodFields } from "./stats-world-period-fields";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { type KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { LevelFilters } from "./level-filters";

type StatsRankingFiltersMobileProps = {
  world: string | null;
  minLvl: string;
  maxLvl: string;
  period: KillStatsPeriod;
  onWorldChange: (value: string | null) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
  onPeriodChange: (value: KillStatsPeriod) => void;
};

export const StatsRankingFiltersMobile = ({
  world,
  minLvl,
  maxLvl,
  period,
  onWorldChange,
  onMinLvlChange,
  onMaxLvlChange,
  onPeriodChange,
}: StatsRankingFiltersMobileProps) => {
  const { t } = useTranslation();

  return (
    <MobileFiltersDrawer
      title={t("kills.filters.title")}
      closeLabel={t("kills.filters.close")}
    >
      <StatsWorldPeriodFields
        world={world}
        period={period}
        onWorldChange={onWorldChange}
        onPeriodChange={onPeriodChange}
      />

      <div className="space-y-2">
        <Label>{t("kills.filters.levelRange")}</Label>
        <div className="flex items-center gap-2">
          <LevelFilters
            minLvl={minLvl}
            maxLvl={maxLvl}
            onMinLvlChange={onMinLvlChange}
            onMaxLvlChange={onMaxLvlChange}
            inputClassName="min-w-0 flex-1"
            separator={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>
    </MobileFiltersDrawer>
  );
};
