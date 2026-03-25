import { Label } from "@lootlog/ui/components/label";
import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
} from "@/components/filters";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Swords, Award } from "lucide-react";
import type { Period } from "@/store/battle-filters.store";

type StatisticsFiltersDesktopProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
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
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
}: StatisticsFiltersDesktopProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-end">
      <div>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters={false}
          size="default"
          className="h-10"
        />
      </div>

      <div>
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-[240px]"
        />
      </div>

      <LevelRangeFilter
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
      />

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Award className="h-4 w-4" />
        <Label htmlFor="ph-filter" className="cursor-pointer text-sm">
          Punkty Honoru
        </Label>
        <Checkbox
          id="ph-filter"
          checked={ph === true}
          onCheckedChange={(checked) => onPhChange(checked === true)}
        />
      </div>

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Swords className="h-4 w-4" />
        <Label htmlFor="matchmaking-filter" className="cursor-pointer text-sm">
          Otchłań
        </Label>
        <Checkbox
          id="matchmaking-filter"
          checked={matchmaking === true}
          onCheckedChange={(checked) => onMatchmakingChange(checked === true)}
        />
      </div>
    </div>
  );
};
