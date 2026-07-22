import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxGroup {
  label?: string;
  options: ComboboxOption[];
}

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options?: ComboboxOption[];
  groups?: ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      value,
      onValueChange,
      options = [],
      groups = [],
      placeholder = "Select option...",
      searchPlaceholder = "Search...",
      emptyText = "No results found.",
      disabled = false,
      triggerClassName,
      contentClassName,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selectedOption = React.useMemo(() => {
      const allOptions =
        groups.length > 0 ? groups.flatMap((g) => g.options) : options;
      return allOptions.find((option) => option.value === value);
    }, [value, options, groups]);

    const handleSelect = (currentValue: string) => {
      onValueChange?.(currentValue);
      setOpen(false);
    };

    const renderOptions = (opts: ComboboxOption[]) => {
      return opts.map((option) => (
        <CommandItem
          key={option.value}
          value={option.value}
          onSelect={handleSelect}
          className="ll:relative ll:data-[selected=true]:bg-gray-400/30 ll:h-6 ll:transition-all ll:cursor-pointer ll:select-none ll:box-border ll:border-gray-400 ll:border-solid ll:border ll:items-center ll:text-white ll:text-[11px] ll:bg-transparent ll:rounded-sm ll:py-1.5 ll:pl-2 ll:pr-8"
        >
          <span className="ll:absolute ll:right-2 ll:flex ll:h-3.5 ll:w-3.5 ll:items-center ll:justify-center">
            {value === option.value && <CheckIcon className="ll:h-4 ll:w-4" />}
          </span>
          {option.label}
        </CommandItem>
      ));
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            role="combobox"
            aria-expanded={open}
            className={cn(
              "ll:justify-between ll:gap-2 ll:px-1",
              triggerClassName,
            )}
            disabled={disabled}
          >
            <span className="ll:truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className="ll:h-4 ll:w-4 ll:shrink-0 ll:opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "ll:p-0 ll:border-solid ll:border-gray-400 ll:bg-black/90 ll:rounded ll:border ll:box-border ll:shadow-md ll:w-full",
            contentClassName,
          )}
        >
          <Command className="ll:bg-transparent ll:w-full">
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="ll:max-h-none ll:overflow-visible">
              <ScrollArea className="ll:max-h-60">
                <CommandEmpty className="ll:text-white ll:text-xs ll:py-2 ll:px-2">
                  {emptyText}
                </CommandEmpty>
                {groups.length > 0 ? (
                  groups.map((group, index) => (
                    <React.Fragment key={index}>
                      <CommandGroup
                        heading={group.label}
                        className="ll:text-gray-400 ll:text-[10px] ll:font-sans [&_[cmdk-group-heading]]:ll:text-[10px] [&_[cmdk-group-heading]]:ll:font-semibold [&_[cmdk-group-heading]]:ll:text-gray-300 [&_[cmdk-group-heading]]:ll:pl-3 [&_[cmdk-group-heading]]:ll:pr-2 [&_[cmdk-group-heading]]:ll:py-1"
                      >
                        <div className="ll:flex ll:flex-col ll:gap-1 ll:px-0 ll:mt-2">
                          {renderOptions(group.options)}
                        </div>
                      </CommandGroup>
                      {index < groups.length - 1 && (
                        <CommandSeparator className="ll:my-1 ll:bg-gray-400" />
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <CommandGroup>
                    <div className="ll:flex ll:flex-col ll:gap-1 ll:px-0">
                      {renderOptions(options)}
                    </div>
                  </CommandGroup>
                )}
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

Combobox.displayName = "Combobox";
