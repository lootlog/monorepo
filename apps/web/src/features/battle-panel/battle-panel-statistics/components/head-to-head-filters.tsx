import type { Period } from "@/store/battle-filters.store";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFiltersMobile } from "./head-to-head-filters-mobile";
import { HeadToHeadFiltersDesktop } from "./head-to-head-filters-desktop";

type HeadToHeadFiltersProps = {
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

export const HeadToHeadFilters = ({
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
}: HeadToHeadFiltersProps) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="md:hidden">
        <HeadToHeadFiltersMobile
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          selectedWarriors={selectedWarriors}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onWarriorToggle={onWarriorToggle}
        />
      </div>

      <div className="hidden md:block">
        <HeadToHeadFiltersDesktop
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          selectedWarriors={selectedWarriors}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onWarriorToggle={onWarriorToggle}
        />
      </div>
    </div>
  );
};
