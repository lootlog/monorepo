import type { MargonemCharacter } from "@/api/characters.api";
import { CharacterSprite } from "@/components/character-sprite";
import { SettingsSaveBadge } from "@/components/settings/settings-save-badge";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  SettingsPickerCard,
  settingsPickerGridClassName,
} from "@/features/settings/components/shared/settings-picker-card";
import type { SaveMark } from "@/features/settings/components/shared/use-save-marks";
import { cn } from "cn";
import type { FC } from "react";

type SettingsCharacterPickerProps = {
  characters: readonly Pick<
    MargonemCharacter,
    "icon" | "id" | "lvl" | "nick" | "prof"
  >[];
  value: string;
  onValueChange: (characterId: string) => void;
  /** Save badge per character id; badges that appear together are staggered. */
  saveMarkByCharacterId?: Record<string, SaveMark>;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

const BADGE_STAGGER_MS = 40;

/**
 * Single-choice grid of character cards: sprite, nick and level. Cards wrap
 * like the server picker, so both pickers read as one family.
 */
export const SettingsCharacterPicker: FC<SettingsCharacterPickerProps> = ({
  characters,
  value,
  onValueChange,
  saveMarkByCharacterId = {},
  "aria-label": ariaLabel,
  className,
  disabled,
}) => {
  // Characters marked by the same write (same timestamp) reveal their badges
  // one after another, in grid order.
  const badgeDelayByCharacterId: Record<string, number> = {};
  const rankByMarkTime: Record<number, number> = {};

  characters.forEach((character) => {
    const id = String(character.id);
    const saveMark = saveMarkByCharacterId[id];

    if (!saveMark) return;

    const rank = rankByMarkTime[saveMark.at] ?? 0;
    rankByMarkTime[saveMark.at] = rank + 1;
    badgeDelayByCharacterId[id] = rank * BADGE_STAGGER_MS;
  });

  return (
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
        const id = String(character.id);
        const saveMark = saveMarkByCharacterId[id];

        // The sprite sheet frame is 32×48; it is scaled to 3/4 so the card
        // stays close to the server card height.
        const sprite = (
          <span
            aria-hidden
            className="ll:flex ll:h-9 ll:w-6 ll:shrink-0 ll:items-center ll:justify-center"
          >
            <CharacterSprite
              icon={character.icon}
              className="ll:shrink-0 ll:scale-75"
            />
          </span>
        );

        return (
          <SettingsPickerCard
            key={character.id}
            value={id}
            label={`${character.nick} (${character.lvl}${character.prof})`}
            leading={sprite}
            title={character.nick}
            subtitle={`${character.lvl}${character.prof}`}
            badge={
              saveMark ? (
                <SettingsSaveBadge
                  key={saveMark.at}
                  status={saveMark.status}
                  style={{
                    animationDelay: `${badgeDelayByCharacterId[id] ?? 0}ms`,
                  }}
                />
              ) : null
            }
          />
        );
      })}
    </ToggleGroup>
  );
};
