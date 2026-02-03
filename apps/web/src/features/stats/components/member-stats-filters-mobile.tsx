import { useTranslation } from "react-i18next";
import { Filter, TrendingUp, Sword } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Input } from "@lootlog/ui/components/input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { TRACKABLE_NPC_TYPES } from "../constants";
import type { NpcType } from "../hooks/use-guild-kill-stats";

type MemberStatsFiltersMobileProps = {
  world: string | null;
  npcType?: NpcType | "ALL";
  minLvl: string;
  maxLvl: string;
  onWorldChange: (value: string | null) => void;
  onNpcTypeChange: (value: string) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
};

export const MemberStatsFiltersMobile = ({
  world,
  npcType,
  minLvl,
  maxLvl,
  onWorldChange,
  onNpcTypeChange,
  onMinLvlChange,
  onMaxLvlChange,
}: MemberStatsFiltersMobileProps) => {
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
