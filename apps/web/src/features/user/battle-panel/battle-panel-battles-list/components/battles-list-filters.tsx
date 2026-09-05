import {
  toggleBattleSearchWarrior,
  createBattleFilterHandlers,
  type BattleFilters,
} from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";
import { useState, useRef } from "react";
import { useBattlesControllerGetUserWorlds } from "@lootlog/client/battlelog";
import { BattlesListFiltersMobile } from "./battles-list-filters-mobile";
import { BattlesListFiltersDesktop } from "./battles-list-filters-desktop";
import type { SearchWarrior } from "@/lib/api/battlelog-types";

type BattlesListFiltersProps = {
  filters: BattleFilters;
  onFiltersChange: (filters: BattleFilters) => void;
  characters?: Array<{ id: string; name: string; world: string }>;
};

export const BattlesListFilters = ({
  filters,
  onFiltersChange,
  characters = [],
}: BattlesListFiltersProps) => {
  const {
    handleCharacterChange,
    handleTypeChange,
    handleResultChange,
    handlePhToggle,
    handleMinLevelChange,
    handleMaxLevelChange,
    handleMatchmakingToggle,
  } = createBattleFilterHandlers(filters, onFiltersChange);
  const [typeOpenMobile, setTypeOpenMobile] = useState(false);
  const [resultOpenMobile, setResultOpenMobile] = useState(false);
  const [characterOpenMobile, setCharacterOpenMobile] = useState(false);
  const [worldOpenMobile, setWorldOpenMobile] = useState(false);

  const [characterOpenDesktop, setCharacterOpenDesktop] = useState(false);

  const [selectedWarriors, setSelectedWarriors] = useState<SearchWarrior[]>([]);

  const lastStateChangeRef = useRef<Record<string, number>>({});

  const { data: worldsResponse } = useBattlesControllerGetUserWorlds();
  const worlds = worldsResponse?.worlds ?? [];

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const newSelectedWarriors = toggleBattleSearchWarrior(
      selectedWarriors,
      warrior,
    );

    setSelectedWarriors(newSelectedWarriors);

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    onFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const handleWorldChange = (value: string) => {
    createBattleFilterHandlers(filters, onFiltersChange).handleWorldChange(
      value,
    );
    setWorldOpenMobile(false);
  };

  const activeFiltersCount =
    (filters.characterId?.length ?? 0) +
    (filters.type?.length ?? 0) +
    (filters.result?.length ?? 0) +
    (filters.world ? 1 : 0) +
    (filters.ph ? 1 : 0) +
    (filters.matchmaking ? 1 : 0) +
    selectedWarriors.length;

  const createDebouncedHandler = (
    key: string,
    setter: (value: boolean) => void,
  ) => {
    return (open: boolean) => {
      const now = Date.now();
      const lastChange = lastStateChangeRef.current[key] ?? 0;
      const timeSinceLastChange = now - lastChange;

      if (timeSinceLastChange < 100) {
        return;
      }

      lastStateChangeRef.current[key] = now;
      setter(open);
    };
  };

  const handleWorldOpenMobile = createDebouncedHandler(
    "worldMobile",
    setWorldOpenMobile,
  );
  const handleTypeOpenMobile = createDebouncedHandler(
    "typeMobile",
    setTypeOpenMobile,
  );
  const handleResultOpenMobile = createDebouncedHandler(
    "resultMobile",
    setResultOpenMobile,
  );
  const handleCharacterOpenMobile = createDebouncedHandler(
    "characterMobile",
    setCharacterOpenMobile,
  );

  const handleCharacterOpenDesktop = createDebouncedHandler(
    "characterDesktop",
    setCharacterOpenDesktop,
  );

  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="md:hidden">
        <BattlesListFiltersMobile
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          typeOpen={typeOpenMobile}
          resultOpen={resultOpenMobile}
          characterOpen={characterOpenMobile}
          worldOpen={worldOpenMobile}
          selectedWarriors={selectedWarriors}
          worlds={worlds}
          characters={characters}
          onTypeOpenChange={handleTypeOpenMobile}
          onResultOpenChange={handleResultOpenMobile}
          onCharacterOpenChange={handleCharacterOpenMobile}
          onWorldOpenChange={handleWorldOpenMobile}
          onCharacterChange={handleCharacterChange}
          onTypeChange={handleTypeChange}
          onResultChange={handleResultChange}
          onWarriorToggle={handleWarriorToggle}
          onPhToggle={handlePhToggle}
          onMatchmakingToggle={handleMatchmakingToggle}
          onWorldChange={handleWorldChange}
        />
      </div>

      <div className="hidden md:block">
        <BattlesListFiltersDesktop
          filters={filters}
          characterOpen={characterOpenDesktop}
          selectedWarriors={selectedWarriors}
          worlds={worlds}
          characters={characters}
          onCharacterOpenChange={handleCharacterOpenDesktop}
          onCharacterChange={handleCharacterChange}
          onTypeChange={handleTypeChange}
          onResultChange={handleResultChange}
          onWarriorToggle={handleWarriorToggle}
          onPhToggle={handlePhToggle}
          onMatchmakingToggle={handleMatchmakingToggle}
          onWorldChange={handleWorldChange}
          onMinLevelChange={handleMinLevelChange}
          onMaxLevelChange={handleMaxLevelChange}
        />
      </div>
    </div>
  );
};
