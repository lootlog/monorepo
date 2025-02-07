import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, XCircle, ChevronDown, XIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Separator } from "components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandInputRaw,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "components/ui/command";
import { ScrollArea } from "components/ui/scroll-area";
import { cn } from "utils/cn";

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary:
          "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Props for MultiSelect component
 */
interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  /**
   * An array of option objects to be displayed in the multi-select component.
   * Each option object has a label, value, and an optional icon.
   */
  options: {
    /** The text to display for the option. */
    label: string;
    /** The unique value associated with the option. */
    value: string;
    /** Optional icon component to display alongside the option. */
    icon?: React.ComponentType<{ className?: string }>;
  }[];

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (value: string[]) => void;

  onClose: (value: string[]) => void;

  /** The default selected values when the component mounts. */
  defaultValue?: string[];

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to "Select options".
   */
  placeholder?: string;

  /**
   * Animation duration in seconds for the visual effects (e.g., bouncing badges).
   * Optional, defaults to 0 (no animation).
   */
  animation?: number;

  /**
   * Maximum number of items to display. Extra selected items will be summarized.
   * Optional, defaults to 3.
   */
  maxCount?: number;

  /**
   * The modality of the popover. When set to true, interaction with outside elements
   * will be disabled and only popover content will be visible to screen readers.
   * Optional, defaults to false.
   */
  modalPopover?: boolean;

  /**
   * If true, renders the multi-select component as a child of another component.
   * Optional, defaults to false.
   */
  asChild?: boolean;

  /**
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string;

  commandSearch?: boolean;
  controlledSearch?: boolean;

  onSearchChange?: (value: string) => void;
  searchValue?: string;
  loading?: boolean;
}

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
  (
    {
      options,
      onValueChange,
      onClose,
      variant,
      defaultValue = [],
      placeholder = "Select options",
      animation = 0,
      maxCount = 3,
      modalPopover = false,
      commandSearch = false,
      controlledSearch = false,
      onSearchChange,
      searchValue,
      loading = false,
      //   asChild = false,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(defaultValue);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isAnimating] = React.useState(false);

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === "Enter") {
        setIsPopoverOpen(true);
      } else if (event.key === "Backspace" && !event.currentTarget.value) {
        const newSelectedValues = [...selectedValues];
        newSelectedValues.pop();
        setSelectedValues(newSelectedValues);
        onValueChange(newSelectedValues);
      }
    };

    const toggleOption = (option: string, tag?: boolean) => {
      const newSelectedValues = selectedValues.includes(option)
        ? selectedValues.filter((value) => value !== option)
        : [...selectedValues, option];
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);

      if (tag) {
        onClose(newSelectedValues);
      }
    };

    const handleClear = () => {
      setSelectedValues([]);
      onValueChange([]);
      onClose([]);
    };

    const handleClose = () => {
      setIsPopoverOpen(false);
      onClose(selectedValues);
    };

    const handlePopoverStateChange = (isOpen: boolean) => {
      if (!isOpen) {
        handleClose();
        return;
      }

      setIsPopoverOpen(isOpen);
    };

    const handleTogglePopover = () => {
      setIsPopoverOpen((prev) => !prev);
    };

    const clearExtraOptions = () => {
      const newSelectedValues = selectedValues.slice(0, maxCount);
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
      onClose(newSelectedValues);
    };

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={handlePopoverStateChange}
        modal={modalPopover}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={handleTogglePopover}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit",
              className
            )}
          >
            {selectedValues.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {selectedValues.slice(0, maxCount).map((value) => {
                    const option = options.find((o) => o.value === value);

                    return (
                      <Badge
                        key={value}
                        className={cn(
                          "px-2",
                          isAnimating ? "animate-bounce" : "",
                          multiSelectVariants({ variant })
                        )}
                        style={{ animationDuration: `${animation}s` }}
                      >
                        <span className="max-w-24 text-ellipsis overflow-hidden mr-1">
                          {option?.label}
                        </span>
                        <div
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value, true);
                          }}
                        >
                          <XCircle className="h-4 w-4 cursor-pointer" />
                        </div>
                      </Badge>
                    );
                  })}
                  {selectedValues.length > maxCount && (
                    <Badge
                      className={cn(
                        "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants({ variant })
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {`+ ${selectedValues.length - maxCount} inne`}
                      <div
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions();
                        }}
                      >
                        <XCircle className="ml-2 h-4 w-4 cursor-pointer" />
                      </div>
                    </Badge>
                  )}
                </div>
                <div
                  className="flex items-center justify-between"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClear();
                  }}
                >
                  <XIcon className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                  <Separator
                    orientation="vertical"
                    className="flex min-h-6 h-full"
                  />
                  <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mx-auto w-full">
                <span className="text-sm text-muted-foreground mx-3">
                  {placeholder}
                </span>
                <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-64"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
        >
          <Command className="bg-background">
            {commandSearch && (
              <CommandInput
                placeholder="Szukaj..."
                onKeyDown={handleInputKeyDown}
              />
            )}
            {controlledSearch && (
              <CommandInputRaw
                placeholder="Szukaj..."
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSearchChange?.(e.target.value)
                }
                defaultValue={searchValue}
              />
            )}
            <CommandList>
              <CommandEmpty>Brak wyników.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="max-h-56 h-56">
                  {loading && (
                    <div className="py-6 px-6 text-center text-sm flex items-center justify-center">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                  {options.length === 0 && (
                    <div className="py-6 text-center text-sm">Brak wyników</div>
                  )}
                  {options.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => toggleOption(option.value)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </div>
                        {option.icon && (
                          <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {selectedValues.length > 0 && (
                    <>
                      <CommandItem
                        onSelect={handleClear}
                        className="flex-1 justify-center cursor-pointer p-0"
                      >
                        <Button variant="ghost" className="w-full" size="sm">
                          Wyczyść
                        </Button>
                      </CommandItem>
                      <Separator
                        orientation="vertical"
                        className="flex min-h-6 h-full"
                      />
                    </>
                  )}
                  <CommandItem
                    onSelect={handleClose}
                    className="flex-1 justify-center cursor-pointer max-w-full p-0"
                  >
                    <Button variant="default" className="w-full" size="sm">
                      Zapisz
                    </Button>
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
