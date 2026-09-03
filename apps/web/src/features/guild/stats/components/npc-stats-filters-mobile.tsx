import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Sword, TrendingUp } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import type { NpcType } from "@lootlog/client/main";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { TRACKABLE_NPC_TYPES } from "../constants";

type NpcStatsFiltersMobileProps = {
  world: string | null;
  npcType?: NpcType | "ALL";
  minLvl: string;
  maxLvl: string;
  period: KillStatsPeriod;
  onWorldChange: (value: string | null) => void;
  onNpcTypeChange: (value: string) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
  onPeriodChange: (value: KillStatsPeriod) => void;
};

const createNumericLevelChangeHandler =
  (onLevelChange: (value: string) => void) =>
  (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    if (nextValue === "" || /^\d+$/.test(nextValue)) {
      onLevelChange(nextValue);
    }
  };

export const NpcStatsFiltersMobile = ({
  world,
  npcType,
  minLvl,
  maxLvl,
  period,
  onWorldChange,
  onNpcTypeChange,
  onMinLvlChange,
  onMaxLvlChange,
  onPeriodChange,
}: NpcStatsFiltersMobileProps) => {
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

      <div className="space-y-2">
        <Label>{t("kills.filters.npcType")}</Label>
        <Select
          value={npcType ?? "ALL"}
          onValueChange={(value) => {
            if (value !== null) onNpcTypeChange(value);
          }}
          items={[
            { value: "ALL", label: <>{t("kills.filters.allTypes")}</> },
            ...TRACKABLE_NPC_TYPES.map((type) => ({
              value: type,
              label: <>{t(`npcType.${type}`)}</>,
            })),
          ]}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Sword className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("kills.filters.allTypes")}</SelectItem>
            {TRACKABLE_NPC_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`npcType.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              onChange={createNumericLevelChangeHandler(onMinLvlChange)}
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
              onChange={createNumericLevelChangeHandler(onMaxLvlChange)}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </MobileFiltersDrawer>
  );
};
