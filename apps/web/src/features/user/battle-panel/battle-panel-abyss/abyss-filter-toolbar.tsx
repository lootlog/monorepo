import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import {
  AbyssSeasonFilter,
  type AbyssSeasonFilterProps,
} from "./abyss-season-filter";

export type AbyssFiltersProps = AbyssSeasonFilterProps & {
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
};

/** The Abyss hub filters for the filter bar, after its views. */
export const AbyssFilterToolbar = ({
  characterId,
  onCharacterChange,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  ...seasonFilter
}: AbyssFiltersProps) => {
  const characters = useBattleCharacters();

  return (
    <>
      <CharacterSelector
        characters={characters}
        characterId={characterId}
        onCharacterChange={onCharacterChange}
        allowAllCharacters={false}
        className="w-[220px]"
      />
      <AbyssSeasonFilter {...seasonFilter} width="w-[260px]" />
      <LevelRangeFilter
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
      />
    </>
  );
};
