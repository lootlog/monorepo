import type { MargonemCharacter } from "@/api/characters.api";
import { CharacterSprite } from "@/components/character-sprite";
import { SettingsSaveBadge } from "@/features/settings/components/shared/settings-save-badge";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  SettingsPickerCard,
  settingsPickerGridClassName,
} from "@/features/settings/components/shared/settings-picker-card";
import type { SettingsSaveMark } from "@/lib/settings-persistence/settings-save-status.store";
import { cn } from "cn";
import type { FC } from "react";

type SettingsCharacterPickerProps = {
  characters: readonly Pick<
    MargonemCharacter,
    "icon" | "id" | "lvl" | "nick" | "prof"
  >[];
  value: string;
  onValueChange: (characterId: string) => void;
  saveMarkByCharacterId?: Record<string, SettingsSaveMark>;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

const BADGE_STAGGER_MS = 40;

export const SettingsCharacterPicker: FC<SettingsCharacterPickerProps> = ({
  characters,
  value,
  onValueChange,
  saveMarkByCharacterId = {},
  "aria-label": ariaLabel,
  className,
  disabled,
}) => {
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
        if (nextValue) onValueChange(nextValue);
      }}
      className={cn(settingsPickerGridClassName, className)}
    >
      {characters.map((character) => {
        const id = String(character.id);
        const saveMark = saveMarkByCharacterId[id];

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
