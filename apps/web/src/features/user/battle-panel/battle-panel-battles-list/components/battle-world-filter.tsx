import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { cn } from "cn";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function BattleWorldFilter({
  world: selectedWorld,
  worlds,
  open,
  onOpenChange,
  onChange,
}: {
  world?: string;
  worlds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (world: string) => void;
}) {
  const { t } = useTranslation();
  const worldListId = useId();

  return (
    <div className="space-y-2">
      <Label>{t("battlePanel.filters.world")}</Label>
      <Popover open={open} onOpenChange={onOpenChange} modal={false}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-controls={worldListId}
              aria-expanded={open}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">
                  {selectedWorld
                    ? capitalizeFirstLetter(selectedWorld)
                    : t("battlePanel.filters.allWorlds")}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent
          className="w-[var(--anchor-width)] p-0"
          initialFocus={false}
        >
          <Command>
            <CommandInput
              placeholder={t("battlePanel.filters.worldSearchPlaceholder")}
            />
            <CommandList id={worldListId}>
              <CommandEmpty>{t("battlePanel.filters.noWorlds")}</CommandEmpty>
              <CommandGroup>
                {worlds.map((world) => (
                  <CommandItem
                    key={world}
                    value={world}
                    onSelect={() => onChange(world)}
                  >
                    {capitalizeFirstLetter(world)}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedWorld === world ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
