import type { Period } from "@/store/battle-filters.store";
import { StatisticsFiltersMobile } from "./statistics-filters-mobile";
import { StatisticsFiltersDesktop } from "./statistics-filters-desktop";

interface StatisticsFiltersProps {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
}

export function StatisticsFilters({
  characterId,
  period,
  minLevel,
  maxLevel,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
}: StatisticsFiltersProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="md:hidden">
        <StatisticsFiltersMobile
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
        />
      </div>

      <div className="hidden md:block">
        <StatisticsFiltersDesktop
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
        />
      </div>
    </div>
  );
}
