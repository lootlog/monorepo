import {
  Filter,
  Calendar,
  TrendingUp,
  User,
  Swords,
  Award,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useBattlesControllerGetUserCharacters } from "@lootlog/api-client/react-query/battlelog/battles";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useTranslation } from "react-i18next";

type StatisticsFiltersMobileProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  showMatchmakingFilter?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
};

export const StatisticsFiltersMobile = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  matchmaking,
  showMatchmakingFilter = true,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
}: StatisticsFiltersMobileProps) => {
  const { t } = useTranslation();
  const { data: charactersResponse } = useBattlesControllerGetUserCharacters();
  const characters = charactersResponse?.characters ?? [];
  const periodOptions = [
    { value: "7d" as const, label: t("battlePanel.filters.periodOptions.7d") },
    {
      value: "30d" as const,
      label: t("battlePanel.filters.periodOptions.30d"),
    },
    {
      value: "90d" as const,
      label: t("battlePanel.filters.periodOptions.90d"),
    },
    {
      value: "all" as const,
      label: t("battlePanel.filters.periodOptions.all"),
    },
  ];

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>{t("battlePanel.filters.title")}</span>
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex max-h-[85vh] flex-col p-4">
        <DrawerHeader className="mb-4 shrink-0">
          <DrawerTitle>{t("battlePanel.filters.statisticsTitle")}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-2">
            <div className="space-y-2">
              <Label>{t("battlePanel.filters.character")}</Label>
              <Select
                value={characterId}
                onValueChange={(value) =>
                  onCharacterChange(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SelectValue
                      placeholder={t("battlePanel.filters.selectCharacter")}
                    />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {characters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name} ({char.world})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("battlePanel.filters.period")}</Label>
              <Select value={period} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("battlePanel.filters.levelRange")}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder={t("battlePanel.filters.minPlaceholder")}
                    value={minLevel ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      onMinLevelChange(value ? Number(value) : undefined);
                    }}
                    min={1}
                    max={500}
                    className="w-full"
                  />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder={t("battlePanel.filters.maxPlaceholder")}
                    value={maxLevel ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      onMaxLevelChange(value ? Number(value) : undefined);
                    }}
                    min={1}
                    max={500}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <Label htmlFor="ph-filter-mobile" className="cursor-pointer">
                  {t("battlePanel.filters.honorPoints")}
                </Label>
              </div>
              <Checkbox
                id="ph-filter-mobile"
                checked={ph === true}
                onCheckedChange={(checked) => onPhChange(checked === true)}
              />
            </div>

            {showMatchmakingFilter && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  <Label
                    htmlFor="matchmaking-filter-mobile"
                    className="cursor-pointer"
                  >
                    {t("battlePanel.filters.matchmaking")}
                  </Label>
                </div>
                <Checkbox
                  id="matchmaking-filter-mobile"
                  checked={matchmaking === true}
                  onCheckedChange={(checked) =>
                    onMatchmakingChange(checked === true)
                  }
                />
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="mt-6 shrink-0">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              {t("battlePanel.actions.close")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
