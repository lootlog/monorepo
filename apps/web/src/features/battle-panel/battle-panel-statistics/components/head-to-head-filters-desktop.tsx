import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
  WarriorSearchFilter,
} from "@/components/filters";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Swords, Award } from "lucide-react";
import type { Period } from "@/store/battle-filters.store";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";

type HeadToHeadFiltersDesktopProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  selectedWarriors: Warrior[];
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
};

export const HeadToHeadFiltersDesktop = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  matchmaking,
  selectedWarriors,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
  onMatchmakingChange,
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
      />

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Award className="h-4 w-4" />
        <Label htmlFor="ph-filter-h2h" className="cursor-pointer text-sm">
          Punkty Honoru
        </Label>
        <Checkbox
          id="ph-filter-h2h"
          checked={ph === true}
          onCheckedChange={(checked) => onPhChange(checked === true)}
        />
      </div>

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Swords className="h-4 w-4" />
        <Label
          htmlFor="matchmaking-filter-h2h"
          className="cursor-pointer text-sm"
        >
          Otchłań
        </Label>
        <Checkbox
          id="matchmaking-filter-h2h"
          checked={matchmaking === true}
          onCheckedChange={(checked) => onMatchmakingChange(checked === true)}
        />
      </div>
    </div>
  );
};
