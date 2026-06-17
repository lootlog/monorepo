import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

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
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (minInputRef.current && minInputRef.current !== document.activeElement) {
      minInputRef.current.value = minLvl;
    }
  }, [minLvl]);

  useEffect(() => {
    if (maxInputRef.current && maxInputRef.current !== document.activeElement) {
      maxInputRef.current.value = maxLvl;
    }
  }, [maxLvl]);

  const handleMinLvlInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (value !== "" && !/^\d+$/.test(value)) {
      e.currentTarget.value = minLvl;
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onMinLvlChange(value);
    }, 300);
  };

  const handleMaxLvlInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (value !== "" && !/^\d+$/.test(value)) {
      e.currentTarget.value = maxLvl;
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onMaxLvlChange(value);
    }, 300);
  };

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

      <div className="space-y-2">
        <Label>{t("kills.filters.levelRange")}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              ref={minInputRef}
              type="text"
              inputMode="numeric"
              placeholder={t("kills.filters.minLevel")}
              defaultValue={minLvl}
              onInput={handleMinLvlInput}
              className="w-full"
            />
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              ref={maxInputRef}
              type="text"
              inputMode="numeric"
              placeholder={t("kills.filters.maxLevel")}
              defaultValue={maxLvl}
              onInput={handleMaxLvlInput}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </MobileFiltersDrawer>
  );
};
