import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Filter, Sword, TrendingUp } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { WorldSwitcher } from "@/components/common/world-switcher";
import type { NpcType } from "@/lib/api/generated/main/model/npc-type";
import { TRACKABLE_NPC_TYPES } from "../constants";

type NpcStatsFiltersMobileProps = {
  world: string | null;
  npcType?: NpcType | "ALL";
  minLvl: string;
  maxLvl: string;
  onWorldChange: (value: string | null) => void;
  onNpcTypeChange: (value: string) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
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
  onWorldChange,
  onNpcTypeChange,
  onMinLvlChange,
  onMaxLvlChange,
}: NpcStatsFiltersMobileProps) => {
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
            <Label>{t("kills.filters.world")}</Label>
            <WorldSwitcher
              value={world}
              onValueChange={onWorldChange}
              showAllOption
              width="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("kills.filters.npcType")}</Label>
            <Select value={npcType ?? "ALL"} onValueChange={onNpcTypeChange}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Sword className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.filters.allTypes")}
                </SelectItem>
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
