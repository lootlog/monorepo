import { StatsWorldPeriodFields } from "./stats-world-period-fields";
import { useTranslation } from "react-i18next";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { type KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

type NpcKillersFiltersMobileProps = {
  world: string | null;
  period: KillStatsPeriod;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: KillStatsPeriod) => void;
};

export const NpcKillersFiltersMobile = ({
  world,
  period,
  onWorldChange,
  onPeriodChange,
}: NpcKillersFiltersMobileProps) => {
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
    </MobileFiltersDrawer>
  );
};
