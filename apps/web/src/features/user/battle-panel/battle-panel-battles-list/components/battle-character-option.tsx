import { CommandItem } from "@lootlog/ui/components/command";
import { Check } from "lucide-react";
import { cn } from "cn";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";

export const BattleCharacterOption = ({
  character: char,
  selected,
  onSelect,
}: {
  character: { id: string; name: string; world: string };
  selected: boolean;
  onSelect: (id: string) => void;
}) => (
  <CommandItem
    value={`${char.name} ${char.world}`}
    onSelect={() => onSelect(char.id)}
    className="p-0 px-2 gap-0"
  >
    <PlayerTile
      player={char}
      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
      className="scale-70 mr-2"
    />
    {char.name} ({char.world})
    <Check
      className={cn("ml-auto h-4 w-4", selected ? "opacity-100" : "opacity-0")}
    />
  </CommandItem>
);
