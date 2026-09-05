import { useTranslation } from "react-i18next";
import { Label } from "@lootlog/ui/components/label";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

export const StatsWorldPeriodFields = ({
  world,
  period,
  onWorldChange,
  onPeriodChange,
}: {
  world: string | null;
  period: KillStatsPeriod;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: KillStatsPeriod) => void;
}) => {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
};
