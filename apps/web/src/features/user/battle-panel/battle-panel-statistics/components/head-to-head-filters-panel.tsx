import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { PeriodSelector } from "@/components/filters/period-selector";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import { Separator } from "@lootlog/ui/components/separator";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Award, ArrowRight, Swords } from "lucide-react";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type HeadToHeadFiltersPanelProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  selectedWarriors: Warrior[];
  showPhFilter?: boolean;
  showMatchmakingFilter?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
};

export const HeadToHeadFiltersPanel = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  matchmaking,
  selectedWarriors,
  showPhFilter = true,
  showMatchmakingFilter = true,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
  onWarriorToggle,
}: HeadToHeadFiltersPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.searchOpponent")}
        </Label>
        <WarriorSearchFilter
          selectedWarriors={selectedWarriors}
          onWarriorToggle={onWarriorToggle}
          placeholder={t("battlePanel.filters.searchOpponent")}
          className="w-full"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.character")}
        </Label>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters
          className="h-10 w-full justify-between"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.period")}
        </Label>
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-full"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.levelRange")}
        </Label>
        <div className="flex items-center gap-2">
          <LevelRangeFilter
            minLevel={minLevel}
            maxLevel={maxLevel}
            onMinLevelChange={onMinLevelChange}
            onMaxLevelChange={onMaxLevelChange}
            inputClassName="w-full"
            containerClassName="flex-1"
            separator={
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
          />
        </div>
      </div>

      {showPhFilter && (
        <>
          <Separator />
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <Label htmlFor="ph-filter-h2h" className="cursor-pointer">
                {t("battlePanel.filters.honorPoints")}
              </Label>
            </div>
            <Checkbox
              id="ph-filter-h2h"
              checked={ph === true}
              onCheckedChange={(checked) => onPhChange(checked === true)}
            />
          </div>
        </>
      )}

      {showMatchmakingFilter && (
        <>
          <Separator />
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              <Label
                htmlFor="matchmaking-filter-h2h"
                className="cursor-pointer"
              >
                {t("battlePanel.filters.matchmaking")}
              </Label>
            </div>
            <Checkbox
              id="matchmaking-filter-h2h"
              checked={matchmaking === true}
              onCheckedChange={(checked) =>
                onMatchmakingChange(checked === true)
              }
            />
          </div>
        </>
      )}
    </div>
  );
};
