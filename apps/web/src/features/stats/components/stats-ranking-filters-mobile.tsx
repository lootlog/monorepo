import { useRef, useEffect } from "react";
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

type StatsRankingFiltersMobileProps = {
  world: string | null;
  minLvl: string;
  maxLvl: string;
  onWorldChange: (value: string | null) => void;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
};

export const StatsRankingFiltersMobile = ({
  world,
  minLvl,
  maxLvl,
  onWorldChange,
  onMinLvlChange,
  onMaxLvlChange,
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
