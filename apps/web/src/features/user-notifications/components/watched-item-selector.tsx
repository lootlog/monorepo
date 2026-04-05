import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInputRaw,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Spinner } from "@lootlog/ui/components/spinner";
import { ItemImage } from "@/components/tiles";
import type { GameItem } from "@/hooks/api/game-data/use-items";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import { cn } from "@/utils/cn";

type WatchedItemSelectorProps = {
  disabled?: boolean;
  loading: boolean;
  items: GameItem[];
  searchValue: string;
  selectedItem: GameItem | null;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage: string;
  disabledMessage: string;
  onSearchChange: (value: string) => void;
  onSelect: (item: GameItem | null) => void;
};

export const WatchedItemSelector = ({
  disabled = false,
  loading,
  items,
  searchValue,
  selectedItem,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  disabledMessage,
  onSearchChange,
  onSelect,
}: WatchedItemSelectorProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resultsListId = useId();

  const handleSelect = (item: GameItem) => {
    onSelect(item);
    onSearchChange(item.name);
    setOpen(false);
  };

  const handleClear = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSearchChange("");
    onSelect(null);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) {
      return;
    }

    setOpen(isOpen);
  };

  const displayLabel = selectedItem
    ? t("settings.userNotifications.itemSelector.selectedLabel", {
        name: selectedItem.name,
        id: selectedItem.id,
      })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-controls={resultsListId}
          aria-expanded={open}
          disabled={disabled}
          className="justify-between gap-2"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectedItem ? (
              <ItemImage
                icon={selectedItem.icon}
                rarity={
                  (selectedItem.rarity as ItemRarity | null) ??
                  ItemRarity.COMMON
                }
              />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "truncate",
                !selectedItem && "text-muted-foreground",
              )}
            >
              {disabled ? disabledMessage : displayLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selectedItem ? (
              <span
                role="button"
                tabIndex={0}
                onMouseDown={handleClear}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleClear(event);
                  }
                }}
                className="flex items-center justify-center"
              >
                <X className="h-4 w-4 cursor-pointer text-muted-foreground transition-colors hover:text-foreground" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInputRaw
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9"
          />
          <CommandList id={resultsListId}>
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                {loadingMessage}
              </div>
            ) : null}
            {!loading ? <CommandEmpty>{emptyMessage}</CommandEmpty> : null}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.id}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedItem?.id === item.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <ItemImage
                    icon={item.icon}
                    rarity={
                      (item.rarity as ItemRarity | null) ?? ItemRarity.COMMON
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.userNotifications.itemSelector.itemId", {
                        id: item.id,
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("settings.userNotifications.itemSelector.itemLevel", {
                      level: item.lvl,
                    })}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
