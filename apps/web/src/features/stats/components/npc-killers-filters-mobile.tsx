import { useTranslation } from "react-i18next";
import { Filter, Globe } from "lucide-react";
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
import { useWorlds } from "@/hooks/api/game-data/use-worlds";

type NpcKillersFiltersMobileProps = {
  world: string | null;
  onWorldChange: (value: string) => void;
};

export const NpcKillersFiltersMobile = ({
  world,
  onWorldChange,
}: NpcKillersFiltersMobileProps) => {
  const { t } = useTranslation();
  const { data: worlds } = useWorlds();

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
