import { useId, useState } from "react";
import { Check, Users } from "lucide-react";
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
import { cn } from "cn";
import { CharacterAvatar } from "@/components/filters/character-avatar";
import {
  getCharacterDetails,
  type SelectableCharacter,
} from "./character-details";
import { CharacterSelectorTrigger } from "./character-selector-trigger";
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
  characters: readonly SelectableCharacter[];
  size?: "sm" | "default" | "lg";
  className?: string;
};

const renderPlaceholderAvatar = () => (
  <span className="flex size-7 shrink-0 items-center justify-center">
    <Users className="size-4" aria-hidden="true" />
  </span>
);

export function CharacterSelector(props: CharacterSelectorProps) {
  const { characters, size = "lg", className } = props;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { t } = useTranslation();

  const selectedIds = props.multiple
    ? (props.characterIds ?? [])
    : props.characterId
      ? [props.characterId]
      : [];

  const selectedIdSet = new Set(selectedIds);

  const selectedCharacters = characters.filter((character) =>
    selectedIdSet.has(character.id),
  );

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
          <CharacterSelectorTrigger
            selectedCharacters={selectedCharacters}
            placeholder={placeholder}
            // A required character is the page's subject, not a narrowing.
            active={
              Boolean(props.multiple || allowAllCharacters) &&
              selectedCharacters.length > 0
            }
            size={size}
            className={className}
            aria-controls={listId}
            aria-expanded={open}
          />
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
                  <CharacterAvatar icon={character.icon} />
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
