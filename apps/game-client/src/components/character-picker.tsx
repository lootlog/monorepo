import type { MargonemCharacter } from "@/api/characters.api";
import { CharacterSprite } from "@/components/character-sprite";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
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

/**
 * Single-choice row of character sprites. The row never wraps; longer lists
 * scroll horizontally (the mouse wheel scrolls it too).
 */
export const CharacterPicker: FC<CharacterPickerProps> = ({
  characters,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}) => (
  <TooltipProvider>
    <ScrollArea
      data-slot="character-picker"
      orientation="horizontal"
      className={cn("ll:w-full", className)}
    >
      <ToggleGroup
        aria-label={ariaLabel}
        variant="outline"
        spacing={1}
        value={value ? [value] : []}
        onValueChange={([nextValue]: string[]) => {
          // Pressing the selected character again must not clear the choice.
          if (nextValue) onValueChange(nextValue);
        }}
        className="ll:w-max ll:flex-nowrap ll:px-2 ll:pt-1 ll:pb-2.5"
      >
        {characters.map((character) => {
          const label = `${character.nick} (${character.lvl}${character.prof})`;

          return (
            <Tooltip key={character.id}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={String(character.id)}
                  aria-label={label}
                  className="ll:h-auto ll:min-w-0 ll:overflow-hidden ll:p-0.5 ll:hover:border-muted-foreground/50 ll:data-pressed:border-ring ll:data-pressed:bg-accent ll:data-pressed:ring-1 ll:data-pressed:ring-ring"
                >
                  <CharacterSprite aria-hidden icon={character.icon} />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="ll:font-semibold">{label}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </ScrollArea>
  </TooltipProvider>
);
