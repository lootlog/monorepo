import { Label } from "@lootlog/ui/components/label";
import { CharacterSelector } from "@/components/filters/character-selector";
import { BattlePanelLevelRange } from "@/features/user/battle-panel/components/battle-panel-level-range";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Swords, Award } from "lucide-react";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useTranslation } from "react-i18next";

type StatisticsFiltersDesktopProps = {
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

export const StatisticsFiltersDesktop = ({
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
}: StatisticsFiltersDesktopProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
      <div>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters={false}
          size="default"
          className="h-10 w-[240px]"
        />
      </div>

      <div>
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-[240px]"
        />
      </div>

      <BattlePanelLevelRange
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
      />

      <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04]">
        <Award className="size-4" aria-hidden="true" />
        <Label htmlFor="ph-filter" className="cursor-pointer text-sm">
          {t("battlePanel.filters.honorPoints")}
        </Label>
        <Checkbox
          id="ph-filter"
          checked={ph === true}
          onCheckedChange={(checked) => onPhChange(checked === true)}
        />
      </div>

      {showMatchmakingFilter && (
        <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04]">
          <Swords className="size-4" aria-hidden="true" />
          <Label
            htmlFor="matchmaking-filter"
            className="cursor-pointer text-sm"
          >
            {t("battlePanel.filters.matchmaking")}
          </Label>
          <Checkbox
            id="matchmaking-filter"
            checked={matchmaking === true}
            onCheckedChange={(checked) => onMatchmakingChange(checked === true)}
          />
        </div>
      )}
    </div>
  );
};
