import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { StatisticsFiltersMobile } from "./statistics-filters-mobile";
import { StatisticsFiltersDesktop } from "./statistics-filters-desktop";

interface StatisticsFiltersProps {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
}

export function StatisticsFilters({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
}: StatisticsFiltersProps) {
  return (
    <div className="w-full min-w-0">
      <div className="md:hidden">
        <StatisticsFiltersMobile
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
        />
      </div>

      <div className="hidden md:block">
        <StatisticsFiltersDesktop
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
        />
      </div>
    </div>
  );
}
