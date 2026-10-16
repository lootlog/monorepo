import type { ComponentProps } from "react";
import { ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";
import { FilterChipTrigger } from "@lootlog/ui/components/filter-chip-trigger";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { CharacterAvatar } from "@/components/filters/character-avatar";
import {
  getCharacterDetails,
  type SelectableCharacter,
} from "./character-details";

const MAX_TRIGGER_AVATARS = 3;

type CharacterSelectorTriggerProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "variant"
> & {
  selectedCharacters: SelectableCharacter[];
  placeholder: string;
  active: boolean;
};

/** The chosen characters' avatars and name: a chip in a filter bar, a field elsewhere. */
export function CharacterSelectorTrigger({
  selectedCharacters,
  placeholder,
  active,
  size = "lg",
  className,
  ...props
}: CharacterSelectorTriggerProps) {
  const { t } = useTranslation();
  const inFilterBar = useInFilterBar();
  const [selectedCharacter] = selectedCharacters;

  const media =
    selectedCharacters.length > 1 ? (
      <span className="flex shrink-0 -space-x-1.5">
        {selectedCharacters.slice(0, MAX_TRIGGER_AVATARS).map((character) => (
          <CharacterAvatar key={character.id} icon={character.icon} />
        ))}
      </span>
    ) : selectedCharacter ? (
      <CharacterAvatar icon={selectedCharacter.icon} />
    ) : (
      <Users className="size-4 shrink-0" aria-hidden="true" />
    );

  const value =
    selectedCharacters.length > 1
      ? t("ui.characterSelector.selectedCount", {
          count: selectedCharacters.length,
        })
      : (selectedCharacter?.name ?? placeholder);

  // A combobox takes no name from its content.
  const accessibleName = `${t("ui.characterSelector.label")}: ${value}`;

  if (inFilterBar)
    return (
      <FilterChipTrigger
        {...props}
        role="combobox"
        aria-label={accessibleName}
        // A character without a known sprite keeps the filter's icon.
        media={selectedCharacter?.icon ? media : undefined}
        icon={Users}
        label={t("ui.characterSelector.label")}
        value={value}
        active={active}
      />
    );

  return (
    <Button
      {...props}
      variant="outline"
      size={size}
      role="combobox"
      aria-label={accessibleName}
      className={cn(
        "min-w-0 justify-between gap-2",
        // Without a character, the icon and label line up with the filter
        // popovers beside it.
        selectedCharacter ? "px-2" : "px-3",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {media}
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="max-w-full truncate">{value}</span>
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
  );
}
