import type { Period } from "@/store/battle-filters.store";
import { StatisticsFiltersMobile } from "./statistics-filters-mobile";
import { StatisticsFiltersDesktop } from "./statistics-filters-desktop";

interface StatisticsFiltersProps {
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
}

export function StatisticsFilters({
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
}: StatisticsFiltersProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b px-4 py-4 md:py-0">
      <div className="md:hidden">
        <StatisticsFiltersMobile
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          matchmaking={matchmaking}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
          onMatchmakingChange={onMatchmakingChange}
        />
      </div>

      <div className="hidden md:block">
        <StatisticsFiltersDesktop
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          matchmaking={matchmaking}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
          onMatchmakingChange={onMatchmakingChange}
        />
      </div>
    </div>
  );
}
