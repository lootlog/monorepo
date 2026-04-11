import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { Period } from "../hooks/use-loot-stats";

type LootStatsFiltersMobileProps = {
  world: string | null;
  period: Period;
  excludeColossus: boolean;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: Period) => void;
  onExcludeColossusChange: (value: boolean) => void;
};

export const LootStatsFiltersMobile = ({
  world,
  period,
  excludeColossus,
  onWorldChange,
  onPeriodChange,
  onExcludeColossusChange,
}: LootStatsFiltersMobileProps) => {
  const { t } = useTranslation();

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20"
        >
          <Filter className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="mb-4">
          <DrawerTitle>{t("kills.filters.title")}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>{t("kills.filters.world")}</Label>
            <WorldSwitcher
              value={world}
              onValueChange={onWorldChange}
              width="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("loots.stats.filters.period")}</Label>
            <PeriodSelector
              value={period}
              onValueChange={(value) => onPeriodChange(value as Period)}
              width="w-full"
              className="h-9"
            />
          </div>

          <label
            htmlFor="exclude-colossus-mobile"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            <Checkbox
              id="exclude-colossus-mobile"
              checked={excludeColossus}
              onCheckedChange={(checked) => onExcludeColossusChange(!!checked)}
            />
            <span className="select-none text-sm">
              {t("loots.stats.excludeColossus")}
            </span>
          </label>
        </div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              {t("kills.filters.close")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
