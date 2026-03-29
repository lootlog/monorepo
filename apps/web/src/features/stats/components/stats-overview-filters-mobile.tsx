import { useTranslation } from "react-i18next";
import { Filter, TrendingUp } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  TimeBucketSelect,
  type TimeBucket,
} from "./time-bucket-select";

type StatsOverviewFiltersMobileProps = {
  world: string | null;
  minLvl: string;
  maxLvl: string;
  timeBucket: TimeBucket;
  onWorldChange: (value: string | null) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
  onTimeBucketChange: (value: TimeBucket) => void;
};

export const StatsOverviewFiltersMobile = ({
  world,
  minLvl,
  maxLvl,
  timeBucket,
  onWorldChange,
  onMinLvlChange,
  onMaxLvlChange,
  onTimeBucketChange,
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
            <Label>{t("kills.filters.timeBucket")}</Label>
            <TimeBucketSelect
              value={timeBucket}
              onValueChange={onTimeBucketChange}
              className="w-full"
            />
          </div>

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
