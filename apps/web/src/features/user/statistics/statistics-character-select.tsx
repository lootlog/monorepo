import {
  useKillsControllerGetUserKillCharacters,
  type UserKillCharactersResponseDtoOutputCharactersItem,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import type { SelectableCharacter } from "@/components/filters/character-details";
import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";

export type StatisticsCharacter =
  UserKillCharactersResponseDtoOutputCharactersItem;

type StatisticsCharacterSelectProps = {
  characterId: string | undefined;
  onCharacterChange: (character: StatisticsCharacter | undefined) => void;
  className?: string;
};

/** The characters with tracked kills; picking one narrows the statistics to it. */
export function StatisticsCharacterSelect({
  characterId,
  onCharacterChange,
  className,
}: StatisticsCharacterSelectProps) {
  const { t } = useTranslation();

  const tracked =
    useKillsControllerGetUserKillCharacters({
      query: { staleTime: 60_000 },
    }).data?.characters ?? [];

  const battleCharacters = useBattleCharacters();

  // An older Game client reports kills without the character's details; the
  // battle log may still know them.
  const characters = tracked.map((character): SelectableCharacter => {
    const known = battleCharacters.find(
      (battle) =>
        battle.id === character.characterId && battle.world === character.world,
    );

    return {
      id: character.characterId,
      world: character.world,
      name:
        character.name ??
        known?.name ??
        t("statistics.unnamedCharacter", { id: character.characterId }),
      icon: character.icon ?? known?.icon,
      lvl: character.level ?? known?.lvl,
      prof: character.profession ?? known?.prof,
    };
  });

  return (
    <CharacterSelector
      characters={characters}
      characterId={characterId}
      onCharacterChange={(id) =>
        onCharacterChange(
          tracked.find((character) => character.characterId === id),
        )
      }
      allowAllCharacters
      className={className}
    />
  );
}
