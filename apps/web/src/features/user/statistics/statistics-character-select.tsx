import {
  useKillsControllerGetUserKillCharacters,
  type UserKillCharactersResponseDtoOutputCharactersItem,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import type { SelectableCharacter } from "@/components/filters/character-details";
import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";

type StatisticsCharacter = UserKillCharactersResponseDtoOutputCharactersItem;

type StatisticsCharacterSelectProps = {
  characterId: string | undefined;
  world: string | undefined;
  onCharacterChange: (character: StatisticsCharacter | undefined) => void;
  className?: string;
};

const characterKey = (world: string, characterId: string) =>
  `${world}:${characterId}`;

export function StatisticsCharacterSelect({
  characterId,
  world,
  onCharacterChange,
  className,
}: StatisticsCharacterSelectProps) {
  const { t } = useTranslation();

  const tracked =
    useKillsControllerGetUserKillCharacters({
      query: { staleTime: 60_000 },
    }).data?.characters ?? [];

  const battleCharacters = useBattleCharacters();

  const characters = tracked.map((character): SelectableCharacter => {
    const known = battleCharacters.find(
      (battle) =>
        battle.id === character.characterId && battle.world === character.world,
    );

    return {
      id: characterKey(character.world, character.characterId),
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
      characterId={
        world && characterId ? characterKey(world, characterId) : undefined
      }
      onCharacterChange={(key) =>
        onCharacterChange(
          tracked.find(
            (character) =>
              characterKey(character.world, character.characterId) === key,
          ),
        )
      }
      allowAllCharacters
      className={className}
    />
  );
}
