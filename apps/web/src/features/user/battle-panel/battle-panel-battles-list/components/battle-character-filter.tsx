import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@lootlog/ui/components/command";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { ChevronsUpDown, User } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { BattleCharacterOption } from "./battle-character-option";

export function BattleCharacterFilter({
  selectedIds,
  characters,
  open,
  onOpenChange,
  onChange,
  showLabel = true,
  placeholder,
  className,
  triggerClassName,
}: {
  selectedIds?: string[];
  showLabel?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  characters: Array<{ id: string; name: string; world: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const characterListId = useId();
  const selectedCharacterIds = new Set(selectedIds);

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <Label>{t("battlePanel.filters.character")}</Label>}
      <Popover open={open} onOpenChange={onOpenChange} modal={false}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-controls={characterListId}
              aria-expanded={open}
              className={cn("w-full justify-between", triggerClassName)}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">
                  {selectedIds && selectedIds.length > 0
                    ? t("battlePanel.filters.selectedCount", {
                        count: selectedIds.length,
                      })
                    : (placeholder ?? t("battlePanel.filters.allCharacters"))}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[var(--anchor-width)] p-0">
          <Command>
            <CommandInput
              placeholder={t("battlePanel.filters.characterSearchPlaceholder")}
            />
            <CommandList id={characterListId}>
              <CommandEmpty>
                {t("battlePanel.filters.noCharacters")}
              </CommandEmpty>
              <CommandGroup>
                {characters.map((char) => (
                  <BattleCharacterOption
                    key={char.id}
                    character={char}
                    selected={selectedCharacterIds.has(char.id)}
                    onSelect={onChange}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
