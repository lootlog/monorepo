import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";

type BattleCharacterSelectProps = {
  characterId: string | undefined;
  onCharacterChange: (characterId: string | undefined) => void;
};

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
