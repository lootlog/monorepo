import { useTranslation } from "react-i18next";
import { Label } from "@lootlog/ui/components/label";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

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
      <div className="space-y-2">
        <Label>{t("kills.filters.world")}</Label>
        <WorldSwitcher
          value={world}
          onValueChange={onWorldChange}
          showAllOption
          width="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("kills.filters.period")}</Label>
        <KillStatsPeriodSelect
          value={period}
          onValueChange={onPeriodChange}
          className="w-full"
        />
      </div>
    </MobileFiltersDrawer>
  );
};
