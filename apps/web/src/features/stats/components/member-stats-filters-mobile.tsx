import { useTranslation } from "react-i18next";
import { Filter, Globe, TrendingUp, Sword } from "lucide-react";
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
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { TRACKABLE_NPC_TYPES } from "../constants";
import type { NpcType } from "../hooks/use-guild-kill-stats";

type MemberStatsFiltersMobileProps = {
  world: string | null;
  npcType?: NpcType | "ALL";
  minLvl: string;
  maxLvl: string;
  onWorldChange: (value: string) => void;
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
  const { data: worlds } = useWorlds();

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
          <DrawerTitle>Filtry</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Świat</Label>
            <Select value={world ?? "ALL"} onValueChange={onWorldChange}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <SelectValue placeholder={t("kills.home.filters.world")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.home.filters.allWorlds")}
                </SelectItem>
                {worlds?.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Typ NPC</Label>
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
            <Label>Zakres poziomów</Label>
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
              Zamknij
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
