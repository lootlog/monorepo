import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
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
import { cn } from "@lootlog/ui/lib/utils";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { PlayerTile } from "@/components/battle";

interface CharacterSelectorProps {
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
  allowAllCharacters?: boolean;
  size?: "sm" | "default";
}

export function CharacterSelector({
  characterId,
  onCharacterChange,
  allowAllCharacters = false,
  size = "sm",
}: CharacterSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: characters } = useBattleCharacters();

  const selectedCharacter = characters?.find((c) => c.id === characterId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} className="gap-2">
          <User className="h-4 w-4" />
          {selectedCharacter
            ? selectedCharacter.name
            : allowAllCharacters
              ? "Wszystkie postacie"
              : "Wybierz postać"}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Szukaj postaci..." />
          <CommandList>
            <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
            <CommandGroup>
              {allowAllCharacters && (
                <CommandItem
                  value="all-characters"
                  onSelect={() => {
                    onCharacterChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !characterId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Wszystkie postacie
                </CommandItem>
              )}
              {characters?.map((character) => (
                <CommandItem
                  key={character.id}
                  value={`${character.name}-${character.world}`}
                  onSelect={() => {
                    onCharacterChange(character.id);
                    setOpen(false);
                  }}
                  className="py-0"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      characterId === character.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <PlayerTile
                      player={{
                        name: character.name,
                        icon: character.icon,
                      }}
                      className="scale-75"
                    />
                    <span>{character.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({character.world})
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
