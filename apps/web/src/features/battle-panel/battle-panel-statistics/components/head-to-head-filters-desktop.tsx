import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
  WarriorSearchFilter,
} from "@/components/filters";
import type { Period } from "@/store/battle-filters.store";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";

type HeadToHeadFiltersDesktopProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  selectedWarriors: Warrior[];
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onWarriorToggle: (warrior: Warrior) => void;
};

export const HeadToHeadFiltersDesktop = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  selectedWarriors,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onWarriorToggle,
}: HeadToHeadFiltersDesktopProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 flex-wrap items-end">
      <WarriorSearchFilter
        selectedWarriors={selectedWarriors}
        onWarriorToggle={onWarriorToggle}
        placeholder="Szukaj przeciwnika..."
      />

      <CharacterSelector
        characterId={characterId}
        onCharacterChange={onCharacterChange}
        allowAllCharacters
        className="w-full md:w-[240px] h-10"
      />

      <PeriodSelector
        value={period}
        onValueChange={onPeriodChange}
        width="w-full md:w-[180px]"
      />

      <LevelRangeFilter
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        minLevelId="min-level-h2h"
        maxLevelId="max-level-h2h"
      />
    </div>
  );
};
