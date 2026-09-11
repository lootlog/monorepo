import type { MargonemCharacter } from "@/api/characters.api";
import { CharacterSprite } from "@/components/character-sprite";
import { TilePicker } from "@/components/tile-picker";
import { TilePickerItem } from "@/components/tile-picker-item";
import type { FC } from "react";

type CharacterPickerProps = {
  characters: readonly Pick<
    MargonemCharacter,
    "icon" | "id" | "lvl" | "nick" | "prof"
  >[];
  value: string;
  onValueChange: (characterId: string) => void;
  "aria-label"?: string;
  className?: string;
};

/** Single-choice row of character sprites. */
export const CharacterPicker: FC<CharacterPickerProps> = ({
  characters,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}) => (
  <TilePicker
    aria-label={ariaLabel}
    className={className}
    contentClassName="ll:p-2.5 ll:pb-4"
    value={value ? [value] : []}
    onValueChange={([nextValue]) => {
      // Pressing the selected character again must not clear the choice.
      if (nextValue) onValueChange(nextValue);
    }}
  >
    {characters.map((character) => (
      <TilePickerItem
        key={character.id}
        value={String(character.id)}
        label={`${character.nick} (${character.lvl}${character.prof})`}
      >
        <CharacterSprite aria-hidden icon={character.icon} />
      </TilePickerItem>
    ))}
  </TilePicker>
);
