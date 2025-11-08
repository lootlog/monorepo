import { Label } from "@lootlog/ui/components/label";
import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
} from "@/components/filters";
import type { Period } from "@/store/battle-filters.store";

type StatisticsFiltersDesktopProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
};

export const StatisticsFiltersDesktop = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
}: StatisticsFiltersDesktopProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6 flex-wrap items-end">
      <div className="space-y-1">
        <Label className="text-xs invisible">Postać</Label>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters={false}
          size="default"
          className="h-10"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs invisible">Okres</Label>
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
        minLevelId="min-level"
        maxLevelId="max-level"
      />
    </div>
  );
};
