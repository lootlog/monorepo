import type { MargonemCharacter } from "@/api/characters.api";
import { CharacterSprite } from "@/components/character-sprite";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  SettingsPickerCard,
  settingsPickerGridClassName,
} from "@/features/settings/components/shared/settings-picker-card";
import { cn } from "cn";
import type { FC } from "react";

type SettingsCharacterPickerProps = {
  characters: readonly Pick<
    MargonemCharacter,
    "icon" | "id" | "lvl" | "nick" | "prof"
  >[];
  value: string;
  onValueChange: (characterId: string) => void;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Single-choice grid of character cards: sprite, nick and level. Cards wrap
 * like the server picker, so both pickers read as one family.
 */
export const SettingsCharacterPicker: FC<SettingsCharacterPickerProps> = ({
  characters,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
  disabled,
}) => (
  <ToggleGroup
    aria-label={ariaLabel}
    disabled={disabled}
    value={value ? [value] : []}
    onValueChange={([nextValue]) => {
      // Pressing the selected character again must not clear the choice.
      if (nextValue) onValueChange(nextValue);
    }}
    className={cn(settingsPickerGridClassName, className)}
  >
    {characters.map((character) => {
      const sprite = (
        <CharacterSprite
          aria-hidden
          icon={character.icon}
          className="ll:shrink-0"
        />
      );

      return (
        <SettingsPickerCard
          key={character.id}
          value={String(character.id)}
          label={`${character.nick} (${character.lvl}${character.prof})`}
          leading={sprite}
          title={character.nick}
          subtitle={`${character.lvl}${character.prof}`}
        />
      );
    })}
  </ToggleGroup>
);
