import { useId, useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { useBattlesControllerGetUserCharacters } from "@lootlog/client/battlelog";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";
import type { BattleCharacter } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { useTranslation } from "react-i18next";

type SingleCharacterSelection = {
  multiple?: false;
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
  allowAllCharacters?: boolean;
};

type MultipleCharacterSelection = {
  multiple: true;
  characterIds?: string[];
  onCharacterToggle: (characterId: string) => void;
};

type CharacterSelectorProps = (
  | SingleCharacterSelection
  | MultipleCharacterSelection
) & {
  size?: "sm" | "default";
  className?: string;
};

const MAX_TRIGGER_AVATARS = 3;

// Crops the 32x48 sprite frame to the character's head and shoulders.
const renderAvatar = (character: BattleCharacter, className?: string) => (
  <span
    key={character.id}
    className={cn(
      "relative size-7 shrink-0 overflow-hidden rounded-md bg-muted",
      className,
    )}
  >
    <PlayerSpriteTile
      icon={character.icon}
      wrapperClassName="absolute -left-0.5 top-0"
      tileClassName="cursor-[inherit] rounded-none hover:bg-transparent"
    />
  </span>
);

const renderPlaceholderAvatar = () => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
    <Users className="size-4" aria-hidden="true" />
  </span>
);

// The level and profession come from the character's latest battle, so a
// character without battles only has its world.
const getCharacterDetails = (character: BattleCharacter) => {
  const world = capitalizeFirstLetter(character.world);

  return character.lvl === null || character.prof === null
    ? world
    : `${world} · ${character.lvl}${character.prof}`;
};

export function CharacterSelector(props: CharacterSelectorProps) {
  const { size = "sm", className } = props;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { data: charactersResponse } = useBattlesControllerGetUserCharacters();
  const { t } = useTranslation();
  const characters = charactersResponse?.characters ?? [];

  const selectedIds = props.multiple
    ? (props.characterIds ?? [])
    : props.characterId
      ? [props.characterId]
      : [];

  const selectedIdSet = new Set(selectedIds);

  const selectedCharacters = characters.filter((character) =>
    selectedIdSet.has(character.id),
  );

  const [selectedCharacter] = selectedCharacters;
  const allowAllCharacters = !props.multiple && props.allowAllCharacters;

  const placeholder =
    props.multiple || allowAllCharacters
      ? t("ui.characterSelector.allCharacters")
      : t("ui.characterSelector.selectCharacter");

  const handleSelect = (characterId: string | undefined) => {
    if (props.multiple) {
      if (characterId) props.onCharacterToggle(characterId);

      return;
    }

    props.onCharacterChange(characterId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={size}
            role="combobox"
            aria-controls={listId}
            aria-expanded={open}
            className={cn("min-w-0 justify-between gap-2 px-2", className)}
          >
            <span className="flex min-w-0 items-center gap-2">
              {selectedCharacters.length > 1 ? (
                <span className="flex shrink-0 -space-x-2">
                  {selectedCharacters
                    .slice(0, MAX_TRIGGER_AVATARS)
                    .map((character) =>
                      renderAvatar(character, "ring-2 ring-background"),
                    )}
                </span>
              ) : selectedCharacter ? (
                renderAvatar(selectedCharacter)
              ) : (
                renderPlaceholderAvatar()
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-full truncate">
                  {selectedCharacters.length > 1
                    ? t("ui.characterSelector.selectedCount", {
                        count: selectedCharacters.length,
                      })
                    : (selectedCharacter?.name ?? placeholder)}
                </span>
                {selectedCharacters.length === 1 && selectedCharacter && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {getCharacterDetails(selectedCharacter)}
                  </span>
                )}
              </span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput
            placeholder={t("ui.characterSelector.searchPlaceholder")}
          />
          <CommandList id={listId}>
            <CommandEmpty>{t("ui.characterSelector.empty")}</CommandEmpty>
            <CommandGroup>
              {allowAllCharacters && (
                <CommandItem
                  value="all-characters"
                  onSelect={() => handleSelect(undefined)}
                  className="gap-2"
                >
                  {renderPlaceholderAvatar()}
                  <span className="truncate">
                    {t("ui.characterSelector.allCharacters")}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      selectedIds.length === 0 ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </CommandItem>
              )}
              {characters.map((character) => (
                <CommandItem
                  key={character.id}
                  value={`${character.name}-${character.world}-${character.id}`}
                  onSelect={() => handleSelect(character.id)}
                  className="gap-2"
                >
                  {renderAvatar(character)}
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {character.name}
                    </span>
                    <span className="text-xs tabular-nums opacity-70">
                      {getCharacterDetails(character)}
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      selectedIdSet.has(character.id)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
