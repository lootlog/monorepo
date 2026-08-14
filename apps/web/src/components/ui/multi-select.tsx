import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDown, XIcon } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandInputRaw,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@/utils/cn";
import { useTranslation } from "react-i18next";

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on the variant prop.
 */
const multiSelectVariants = cva(
  "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/10 text-foreground hover:bg-primary/15",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted:
          "border-primary/30 bg-primary/15 text-foreground hover:bg-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * Props for MultiSelect component
 */
interface MultiSelectProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange">,
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
  /** Controlled selected values. If provided, component follows this value. */
  value?: string[];

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to a localized label.
   */
  placeholder?: string;

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
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string;

  commandSearch?: boolean;
  controlledSearch?: boolean;

  onSearchChange?: (value: string) => void;
  searchValue?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  minimumSearchLength?: number;
  disabled?: boolean;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      onClose,
      variant,
      defaultValue = [],
      value,
      placeholder,
      maxCount = 3,
      modalPopover = false,
      commandSearch = false,
      controlledSearch = false,
      onSearchChange,
      searchValue,
      loading = false,
      searchPlaceholder,
      emptyMessage,
      minimumSearchLength = 1,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [selectedValues, setSelectedValues] = React.useState<string[]>(
      value ?? defaultValue,
    );
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [inputSearchValue, setInputSearchValue] = React.useState(
      searchValue ?? "",
    );
    const optionCacheRef = React.useRef(
      new Map(options.map((option) => [option.value, option])),
    );
    const resolvedPlaceholder = placeholder ?? t("common.selectOptions");
    const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.search");
    const resolvedEmptyMessage = emptyMessage ?? t("common.noResults");
    const hasSearch = commandSearch || controlledSearch;
    const shouldPromptForSearch =
      controlledSearch && inputSearchValue.length < minimumSearchLength;
    const searchPrompt =
      minimumSearchLength > 1
        ? t("common.searchMinimumCharacters", {
            count: minimumSearchLength,
          })
        : t("common.startTypingToSearch");
    const visibleOptions = shouldPromptForSearch ? [] : options;

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValues(value);
      }
    }, [value]);

    React.useEffect(() => {
      if (value === undefined) {
        setSelectedValues(defaultValue);
      }
    }, [defaultValue, value]);

    React.useEffect(() => {
      if (!isPopoverOpen) {
        setInputSearchValue(searchValue ?? "");
      }
    }, [isPopoverOpen, searchValue]);

    React.useEffect(() => {
      for (const option of options) {
        optionCacheRef.current.set(option.value, option);
      }
    }, [options]);

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
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

      if (disabled) {
        return;
      }

      setIsPopoverOpen(isOpen);
    };

    const handleTriggerKeyDown = (
      event: React.KeyboardEvent<HTMLDivElement>,
    ) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (
        event.key !== "Enter" &&
        event.key !== " " &&
        event.key !== "ArrowDown"
      ) {
        return;
      }

      event.preventDefault();
      if (!disabled) {
        setIsPopoverOpen(true);
      }
    };

    const handleControlledSearchChange = (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const nextSearchValue = event.target.value;
      setInputSearchValue(nextSearchValue);
      onSearchChange?.(nextSearchValue);
    };

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={handlePopoverStateChange}
        modal={modalPopover}
      >
        <PopoverTrigger
          render={
            <div
              ref={ref}
              {...props}
              role="combobox"
              aria-expanded={isPopoverOpen}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
              onKeyDown={handleTriggerKeyDown}
              className={cn(
                "group flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-left text-sm text-foreground outline-none transition-[background-color,border-color,box-shadow]",
                "hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                "data-[state=open]:border-ring data-[state=open]:bg-foreground/[0.04] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-ring",
                "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
                className,
              )}
            >
              {selectedValues.length > 0 ? (
                <>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {selectedValues.slice(0, maxCount).map((value) => {
                      const currentOption = options.find(
                        (option) => option.value === value,
                      );
                      const cachedOption = optionCacheRef.current.get(value);
                      const label =
                        currentOption?.label ?? cachedOption?.label ?? value;

                      return (
                        <button
                          type="button"
                          key={value}
                          aria-label={t("common.removeOption", { label })}
                          className={multiSelectVariants({ variant })}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value, true);
                          }}
                        >
                          <span className="max-w-28 truncate">{label}</span>
                          <XIcon
                            aria-hidden="true"
                            className="size-3.5 shrink-0 opacity-60"
                          />
                        </button>
                      );
                    })}
                    {selectedValues.length > maxCount ? (
                      <span
                        className={cn(
                          multiSelectVariants({ variant }),
                          "border-border bg-transparent text-muted-foreground",
                        )}
                      >
                        +{selectedValues.length - maxCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center self-stretch">
                    <button
                      type="button"
                      aria-label={t("common.clear")}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                    >
                      <XIcon aria-hidden="true" className="size-4" />
                    </button>
                    <Separator
                      orientation="vertical"
                      className="mx-1 h-5 bg-border/80"
                    />
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {resolvedPlaceholder}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  />
                </>
              )}
            </div>
          }
        />
        <PopoverContent
          className="w-[var(--anchor-width)] min-w-64 max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border-border bg-popover p-1 shadow-xl"
          align="start"
          sideOffset={6}
          onWheel={(event) => event.stopPropagation()}
        >
          <Command
            className="rounded-lg bg-transparent"
            shouldFilter={!controlledSearch}
          >
            {commandSearch ? (
              <CommandInput
                className="h-10 py-2"
                placeholder={resolvedSearchPlaceholder}
                onKeyDown={handleInputKeyDown}
              />
            ) : null}
            {controlledSearch ? (
              <CommandInputRaw
                placeholder={resolvedSearchPlaceholder}
                value={inputSearchValue}
                onKeyDown={handleInputKeyDown}
                onChange={handleControlledSearchChange}
              />
            ) : null}
            <ScrollArea
              className={cn(
                hasSearch && "h-24",
                !hasSearch && loading && "h-24",
                !hasSearch && options.length === 0 && !loading && "h-12",
              )}
              style={
                !hasSearch && options.length > 0 && !loading
                  ? { height: `${Math.min(options.length, 6) * 2.5}rem` }
                  : undefined
              }
            >
              <CommandList className="h-full max-h-none overflow-visible">
                {!loading ? (
                  <CommandEmpty
                    className={cn(
                      "flex items-center justify-center px-4 py-3 text-center text-sm text-muted-foreground",
                      hasSearch ? "h-24" : "h-12",
                    )}
                  >
                    {shouldPromptForSearch
                      ? searchPrompt
                      : resolvedEmptyMessage}
                  </CommandEmpty>
                ) : null}
                {loading ? (
                  <div
                    className="flex h-24 items-center justify-center"
                    role="status"
                  >
                    <Spinner />
                    <span className="sr-only">{t("common.loading")}</span>
                  </div>
                ) : (
                  <CommandGroup className="p-1">
                    {visibleOptions.map((option) => {
                      const isSelected = selectedValues.includes(option.value);

                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          aria-selected={isSelected}
                          onSelect={() => toggleOption(option.value)}
                          className={cn(
                            "min-h-9 cursor-pointer rounded-lg px-2.5 text-foreground data-[selected=true]:bg-foreground/[0.06] data-[selected=true]:text-foreground",
                            isSelected &&
                              "bg-primary/15 data-[selected=true]:bg-primary/20",
                          )}
                        >
                          {option.icon ? (
                            <option.icon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">
                            {option.label}
                          </span>
                          <CheckIcon
                            aria-hidden="true"
                            className={cn(
                              "ml-2 size-4 shrink-0 text-primary transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
