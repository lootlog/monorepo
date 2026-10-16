"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, type LucideIcon } from "lucide-react";
import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";
import { FilterChipTrigger } from "@lootlog/ui/components/filter-chip-trigger";
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
import { cn } from "cn";

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
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost";
  iconClassName?: string;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  showSearch?: boolean;
  shouldFilter?: boolean;
  renderTriggerLabel?: (selectedCount: number) => string;
  /** The filter's name on its chip in a filter bar; defaults to the placeholder. */
  label?: string;
  /** The filter narrows the results; in a filter bar its chip takes the accent. */
  active?: boolean;
}

function getSelectedValues<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
}

/** The trigger's text: the chosen option, a count, or the placeholder. */
function getTriggerLabel<T>({
  options,
  selectedValues,
  placeholder,
  multiSelect,
  renderTriggerLabel,
}: {
  options: FilterPopoverOption<T>[];
  selectedValues: T[];
  placeholder: string;
  multiSelect: boolean;
  renderTriggerLabel?: (selectedCount: number) => string;
}) {
  if (renderTriggerLabel) return renderTriggerLabel(selectedValues.length);

  if (selectedValues.length === 0) return placeholder;

  if (multiSelect) return `${selectedValues.length} selected`;

  return (
    options.find((option) => option.value === selectedValues[0])?.label ??
    placeholder
  );
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
  size = "lg",
  variant = "outline",
  iconClassName,
  align = "start",
  triggerClassName,
  contentClassName,
  disabled,
  showSearch = true,
  shouldFilter = true,
  renderTriggerLabel,
  active,
  label,
}: FilterPopoverProps<T>) {
  const [open, setOpen] = useState(false);
  const inFilterBar = useInFilterBar();

  const selectedValues = getSelectedValues(value);
  const isSelected = (optionValue: T) => selectedValues.includes(optionValue);

  const triggerLabel = getTriggerLabel({
    options,
    selectedValues,
    placeholder,
    multiSelect,
    renderTriggerLabel,
  });

  const handleSelect = (optionValue: T) => {
    onValueChange(optionValue);

    if (!multiSelect) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {inFilterBar ? (
        <PopoverTrigger
          render={
            <FilterChipTrigger
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              icon={Icon}
              label={label ?? placeholder}
              value={selectedValues.length ? triggerLabel : undefined}
              active={active || (multiSelect && selectedValues.length > 0)}
            />
          }
        />
      ) : (
        <PopoverTrigger
          render={
            <Button
              variant={variant}
              size={size}
              role="combobox"
              aria-label={placeholder}
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                width,
                "justify-between focus-visible:ring-inset focus-visible:ring-offset-0 data-popup-open:border-ring data-popup-open:ring-2 data-popup-open:ring-inset data-popup-open:ring-ring",
                triggerClassName,
              )}
            />
          }
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {Icon && <Icon className={cn("h-4 w-4", iconClassName)} />}
            <span className="truncate text-sm">{triggerLabel}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
      )}
      <PopoverContent
        className={cn(
          "overflow-hidden border-border bg-popover p-1 shadow-lg",
          // A chip is as wide as its value, so the list keeps the field's width.
          inFilterBar ? "w-[200px]" : width,
          contentClassName,
        )}
        align={align}
        onWheel={(e) => e.stopPropagation()}
      >
        <Command
          label={placeholder}
          className="rounded-lg bg-transparent"
          shouldFilter={shouldFilter}
        >
          {showSearch && (
            <CommandInput
              className="h-9 py-2"
              placeholder={searchPlaceholder}
            />
          )}
          <CommandList className="max-h-52">
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
                    className="min-h-9 rounded-md px-2.5"
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
