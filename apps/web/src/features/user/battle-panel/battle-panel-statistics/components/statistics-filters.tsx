import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { StatisticsFiltersMobile } from "./statistics-filters-mobile";
import { StatisticsFiltersDesktop } from "./statistics-filters-desktop";

interface StatisticsFiltersProps {
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
}

export function StatisticsFilters({
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
}: StatisticsFiltersProps) {
  return (
    <div className="sticky top-0 z-10">
      <div className="md:hidden">
        <StatisticsFiltersMobile
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          matchmaking={matchmaking}
          showMatchmakingFilter={showMatchmakingFilter}
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
          showMatchmakingFilter={showMatchmakingFilter}
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
