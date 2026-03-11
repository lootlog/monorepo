import { useState, useRef, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserWorlds } from "@/hooks/api/battle-log/use-user-worlds";
import { BattlesListFiltersMobile } from "./battles-list-filters-mobile";
import { BattlesListFiltersDesktop } from "./battles-list-filters-desktop";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";

export type BattleFilters = {
  world?: string;
  type?: Array<"solo" | "group">;
  search?: string;
  result?: Array<"won" | "lost" | "flee">;
  ph?: boolean;
  matchmaking?: boolean;
  characterId?: Array<string>;
  minLevel?: number;
  maxLevel?: number;
};

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
  const [typeOpenMobile, setTypeOpenMobile] = useState(false);
  const [resultOpenMobile, setResultOpenMobile] = useState(false);
  const [characterOpenMobile, setCharacterOpenMobile] = useState(false);
  const [worldOpenMobile, setWorldOpenMobile] = useState(false);

  const [characterOpenDesktop, setCharacterOpenDesktop] = useState(false);

  const [selectedWarriors, setSelectedWarriors] = useState<Warrior[]>([]);

  const [localMinLevel, setLocalMinLevel] = useState<number | undefined>(
    filters.minLevel,
  );
  const [localMaxLevel, setLocalMaxLevel] = useState<number | undefined>(
    filters.maxLevel,
  );

  const debouncedMinLevel = useDebounce(localMinLevel, 500);
  const debouncedMaxLevel = useDebounce(localMaxLevel, 500);

  const lastStateChangeRef = useRef<Record<string, number>>({});

  const { data: worlds = [] } = useUserWorlds();

  useEffect(() => {
    setLocalMinLevel(filters.minLevel);
  }, [filters.minLevel]);

  useEffect(() => {
    setLocalMaxLevel(filters.maxLevel);
  }, [filters.maxLevel]);

  useEffect(() => {
    if (
      debouncedMinLevel !== filters.minLevel ||
      debouncedMaxLevel !== filters.maxLevel
    ) {
      onFiltersChange({
        ...filters,
        minLevel: debouncedMinLevel,
        maxLevel: debouncedMaxLevel,
      });
    }
  }, [debouncedMinLevel, debouncedMaxLevel, filters, onFiltersChange]);

  const handleCharacterChange = (value: string) => {
    const currentCharacters = filters.characterId || [];
    const newCharacters = currentCharacters.includes(value)
      ? currentCharacters.filter((id) => id !== value)
      : [...currentCharacters, value];

    onFiltersChange({
      ...filters,
      characterId: newCharacters.length > 0 ? newCharacters : undefined,
    });
  };

  const handleTypeChange = (value: "solo" | "group") => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter((t) => t !== value)
      : [...currentTypes, value];

    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleResultChange = (value: "won" | "lost" | "flee") => {
    const currentResults = filters.result || [];
    const newResults = currentResults.includes(value)
      ? currentResults.filter((r) => r !== value)
      : [...currentResults, value];

    onFiltersChange({
      ...filters,
      result: newResults.length > 0 ? newResults : undefined,
    });
  };

  const handleWarriorToggle = (warrior: Warrior) => {
    const isSelected = selectedWarriors.some((w) => w.name === warrior.name);
    let newSelectedWarriors;

    if (isSelected) {
      newSelectedWarriors = selectedWarriors.filter(
        (w) => w.name !== warrior.name,
      );
    } else {
      newSelectedWarriors = [...selectedWarriors, warrior];
    }

    setSelectedWarriors(newSelectedWarriors);

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    onFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const handlePhToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      ph: checked ? true : undefined,
    });
  };

  const handleMatchmakingToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      matchmaking: checked ? true : undefined,
    });
  };

  const handleWorldChange = (value: string) => {
    onFiltersChange({
      ...filters,
      world: filters.world === value ? undefined : value,
    });
    setWorldOpenMobile(false);
  };

  const handleMinLevelChange = (value: number | undefined) => {
    setLocalMinLevel(value);
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    setLocalMaxLevel(value);
  };

  const activeFiltersCount =
    (filters.characterId?.length || 0) +
    (filters.type?.length || 0) +
    (filters.result?.length || 0) +
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
      const lastChange = lastStateChangeRef.current[key] || 0;
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
          filters={{
            ...filters,
            minLevel: localMinLevel,
            maxLevel: localMaxLevel,
          }}
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
