import { CharacterSelector } from "@/components/filters/character-selector";
import { MoreFiltersPopover } from "@/components/filters/more-filters-popover";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useId } from "react";

export type StatisticsFiltersProps = {
  /** Omit with `onCharacterChange` on a page fixed to one character. */
  characterId?: string;
  onCharacterChange?: (characterId: string | undefined) => void;
  allowAllCharacters?: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  ph?: boolean;
  /** Omit to offer no honor points filter. */
  onPhChange?: (ph: boolean) => void;
};

/** The battle statistics filters for the filter bar, after its search. */
export const StatisticsFilterToolbar = ({
  characterId,
  onCharacterChange,
  allowAllCharacters = false,
  period,
  onPeriodChange,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  ph,
  onPhChange,
}: StatisticsFiltersProps) => {
  const phCheckboxId = useId();

  return (
    <>
      {onCharacterChange && (
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters={allowAllCharacters}
          className="w-[220px]"
        />
      )}
      <PeriodSelector
        value={period}
        onValueChange={onPeriodChange}
        width="w-[170px]"
      />
      <MoreFiltersPopover
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        ph={ph}
        onPhChange={onPhChange}
        phCheckboxId={phCheckboxId}
      />
    </>
  );
};
