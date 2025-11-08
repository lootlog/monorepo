"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, type LucideIcon } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
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
import { cn } from "@lootlog/ui/lib/utils";

export interface FilterPopoverOption<T = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  render?: () => ReactNode;
}

interface FilterPopoverProps<T = string> {
  options: FilterPopoverOption<T>[];
  value?: T | T[];
  onValueChange: (value: T) => void;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  icon?: LucideIcon;
  multiSelect?: boolean;
  width?: string;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  showSearch?: boolean;
  shouldFilter?: boolean;
  renderTriggerLabel?: (selectedCount: number) => string;
}

export function FilterPopover<T extends string = string>({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyMessage = "No options found",
  searchPlaceholder = "Search...",
  icon: Icon,
  multiSelect = false,
  width = "w-[180px]",
  align = "start",
  triggerClassName,
  contentClassName,
  disabled = false,
  showSearch = true,
  shouldFilter = true,
  renderTriggerLabel,
}: FilterPopoverProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const isSelected = (optionValue: T) => selectedValues.includes(optionValue);

  const handleSelect = (optionValue: T) => {
    onValueChange(optionValue);
    if (!multiSelect) {
      setOpen(false);
    }
  };

  const getLabel = () => {
    if (renderTriggerLabel) {
      return renderTriggerLabel(selectedValues.length);
    }

    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (multiSelect) {
      return `${selectedValues.length} selected`;
    }

    const selectedOption = options.find(
      (opt) => opt.value === selectedValues[0],
    );
    return selectedOption?.label ?? placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(width, "justify-between h-10", triggerClassName)}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <span className="text-sm truncate">{getLabel()}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", width, contentClassName)}
        align={align}
      >
        <Command shouldFilter={shouldFilter}>
          {showSearch && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const OptionIcon = option.icon;
                const selected = isSelected(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    {option.render ? (
                      option.render()
                    ) : (
                      <>
                        {OptionIcon && <OptionIcon className="mr-2 h-4 w-4" />}
                        {option.label}
                      </>
                    )}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
