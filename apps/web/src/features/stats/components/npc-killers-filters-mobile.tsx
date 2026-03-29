import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
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

type NpcKillersFiltersMobileProps = {
  world: string | null;
  timeBucket: TimeBucket;
  onWorldChange: (value: string | null) => void;
  onTimeBucketChange: (value: TimeBucket) => void;
};

export const NpcKillersFiltersMobile = ({
  world,
  timeBucket,
  onWorldChange,
  onTimeBucketChange,
}: NpcKillersFiltersMobileProps) => {
  const { t } = useTranslation();

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Filter className="h-4 w-4" />
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
