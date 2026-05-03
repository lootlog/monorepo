import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";

type StatsOverviewFiltersMobileProps = {
  world: string | null;
  minLvl: string;
  maxLvl: string;
  onWorldChange: (value: string | null) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
};

export const StatsOverviewFiltersMobile = ({
  world,
  minLvl,
  maxLvl,
  onWorldChange,
  onMinLvlChange,
  onMaxLvlChange,
}: StatsOverviewFiltersMobileProps) => {
  const { t } = useTranslation();

  const handleMinLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      onMinLvlChange(value);
    }
  };

  const handleMaxLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      onMaxLvlChange(value);
    }
  };

  return (
    <MobileFiltersDrawer
      title={t("kills.filters.title")}
      closeLabel={t("kills.filters.close")}
      trigger="floating"
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
        <Label>{t("kills.filters.levelRange")}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("kills.filters.minLevel")}
              value={minLvl}
              onChange={handleMinLvlChange}
              className="w-full"
            />
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("kills.filters.maxLevel")}
              value={maxLvl}
              onChange={handleMaxLvlChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </MobileFiltersDrawer>
  );
};
