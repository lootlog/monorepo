import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Search, type LucideIcon } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@lootlog/ui/components/combobox";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "cn";
import { FilterChipButton } from "@/components/common/filter-chip-button";
import { ThemeInteractiveFrame } from "@/themes";

export type SearchComboboxOption = {
  value: string;
  label: string;
  /** Secondary line under the label, e.g. an NPC type or item rarity. */
  description?: ReactNode;
  /** Trailing text, e.g. a level. */
  meta?: ReactNode;
  /** Leading visual, e.g. a sprite or item image. */
  icon?: ReactNode;
};

type SearchComboboxProps = {
  options: SearchComboboxOption[];
  selected: string[];
  onSelectedChange: (values: string[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage?: string;
  errorMessage?: string;
  loading?: boolean;
  minimumSearchLength?: number;
  icon?: LucideIcon;
  className?: string;
};

const getTriggerLabel = ({
  selected,
  placeholder,
  selectedCountLabel,
}: {
  selected: string[];
  placeholder: string;
  selectedCountLabel: string;
}) => {
  const [first] = selected;

  if (selected.length > 1) return selectedCountLabel;

  return first ?? placeholder;
};

const getEmptyLabel = ({
  errorMessage,
  searchLength,
  minimumSearchLength,
  emptyMessage,
  promptMessage,
}: {
  errorMessage?: string;
  searchLength: number;
  minimumSearchLength: number;
  emptyMessage: string;
  promptMessage: string;
}) => {
  if (errorMessage) return errorMessage;

  if (searchLength < minimumSearchLength) return promptMessage;

  return emptyMessage;
};

/**
 * Multi-select search combobox: an outline trigger that opens a searchable
 * list fed by the caller, with the current selection listed as removable
 * chips under the trigger. The caller owns the search query and its results.
 */
export const SearchCombobox = ({
  options,
  selected,
  onSelectedChange,
  searchValue,
  onSearchChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  errorMessage,
  loading = false,
  minimumSearchLength = 1,
  icon: Icon = Search,
  className,
}: SearchComboboxProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const trimmedSearch = searchValue.trim();
  const meetsMinimumLength = trimmedSearch.length >= minimumSearchLength;
  const visibleOptions = errorMessage || !meetsMinimumLength ? [] : options;
  // A lookup that is still too short to run shows the prompt, not a spinner.
  const isSearching = loading && meetsMinimumLength;

  const itemValues = visibleOptions.map((option) => option.value);
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const hasSelection = selected.length > 0;

  const triggerLabel = getTriggerLabel({
    selected,
    placeholder,
    selectedCountLabel: t("ui.searchCombobox.selectedCount", {
      count: selected.length,
    }),
  });

  const emptyLabel = getEmptyLabel({
    errorMessage,
    searchLength: trimmedSearch.length,
    minimumSearchLength,
    emptyMessage: emptyMessage ?? t("common.noResults"),
    promptMessage:
      minimumSearchLength > 1
        ? t("common.searchMinimumCharacters", { count: minimumSearchLength })
        : t("common.startTypingToSearch"),
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Combobox
        multiple
        value={selected}
        items={itemValues}
        filteredItems={itemValues}
        open={open}
        onOpenChange={setOpen}
        inputValue={searchValue}
        onInputValueChange={(nextValue, details) => {
          if (details.reason === "input-change") onSearchChange(nextValue);
        }}
        onValueChange={(nextValues) => onSelectedChange(nextValues)}
        itemToStringLabel={(value) => labels.get(value) ?? value}
      >
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <ThemeInteractiveFrame isHovered={isHovered} isActive={hasSelection}>
            <ComboboxTrigger
              render={<Button variant="outline" />}
              aria-label={placeholder}
              className="h-9 w-full justify-between gap-2 px-3 font-normal hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground data-popup-open:border-ring"
            >
              <Icon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-left",
                  !hasSelection && "text-muted-foreground",
                )}
              >
                {triggerLabel}
              </span>
            </ComboboxTrigger>
          </ThemeInteractiveFrame>
        </div>
        <ComboboxContent
          className="w-(--anchor-width) min-w-72 max-w-[min(24rem,calc(100vw-2rem))] border-border"
          align="start"
          onWheel={(event) => event.stopPropagation()}
        >
          <ComboboxInput
            showTrigger={false}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {isSearching ? (
            <div
              role="status"
              className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
            >
              <Spinner className="size-4" />
              {t("ui.searchCombobox.searching")}
            </div>
          ) : (
            <ComboboxEmpty
              role={errorMessage ? "alert" : undefined}
              className={cn(errorMessage && "text-destructive")}
            >
              {emptyLabel}
            </ComboboxEmpty>
          )}
          <ComboboxList className={cn(isSearching && "hidden")}>
            {visibleOptions.map((option) => (
              <ComboboxItem
                key={option.value}
                value={option.value}
                className="min-h-12 gap-3 px-2"
              >
                {option.icon ? (
                  <span
                    aria-hidden="true"
                    className="flex w-8 shrink-0 items-center justify-center"
                  >
                    {option.icon}
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.meta ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {option.meta}
                  </span>
                ) : null}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {hasSelection ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={placeholder}>
          {selected.map((value) => {
            const label = labels.get(value) ?? value;

            return (
              <li key={value} className="min-w-0 max-w-full">
                <FilterChipButton
                  removeLabel={t("common.removeOption", { label })}
                  onRemove={() =>
                    onSelectedChange(selected.filter((item) => item !== value))
                  }
                >
                  {label}
                </FilterChipButton>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
