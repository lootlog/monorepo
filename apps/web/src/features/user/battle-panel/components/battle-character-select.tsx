import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";

type BattleCharacterSelectProps = {
  characterId: string | undefined;
  onCharacterChange: (characterId: string | undefined) => void;
};

/**
 * The character whose battles a battle panel page shows. It leads the page's
 * filter bar, as on the kill statistics, so it stays in the bar at every width.
 */
export function BattleCharacterSelect({
  characterId,
  onCharacterChange,
}: BattleCharacterSelectProps) {
  const characters = useBattleCharacters();

  return (
    <CharacterSelector
      characters={characters}
      characterId={characterId}
      onCharacterChange={onCharacterChange}
    />
  );
}
