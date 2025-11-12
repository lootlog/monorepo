import type { Period } from "@/store/battle-filters.store";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFiltersMobile } from "./head-to-head-filters-mobile";
import { HeadToHeadFiltersDesktop } from "./head-to-head-filters-desktop";

type HeadToHeadFiltersProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  selectedWarriors: Warrior[];
  showPhFilter?: boolean;
  showMatchmakingFilter?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
};

export const HeadToHeadFilters = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  matchmaking,
  selectedWarriors,
  showPhFilter = true,
  showMatchmakingFilter = true,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
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
          ph={ph}
          matchmaking={matchmaking}
          selectedWarriors={selectedWarriors}
          showPhFilter={showPhFilter}
          showMatchmakingFilter={showMatchmakingFilter}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
          onMatchmakingChange={onMatchmakingChange}
          onWarriorToggle={onWarriorToggle}
        />
      </div>

      <div className="hidden md:block">
        <HeadToHeadFiltersDesktop
          characterId={characterId}
          period={period}
          minLevel={minLevel}
          maxLevel={maxLevel}
          ph={ph}
          matchmaking={matchmaking}
          selectedWarriors={selectedWarriors}
          showPhFilter={showPhFilter}
          showMatchmakingFilter={showMatchmakingFilter}
          onCharacterChange={onCharacterChange}
          onPeriodChange={onPeriodChange}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
          onPhChange={onPhChange}
          onMatchmakingChange={onMatchmakingChange}
          onWarriorToggle={onWarriorToggle}
        />
      </div>
    </div>
  );
};
