import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Search } from "lucide-react";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@lootlog/ui/components/combobox";
import { Button } from "@lootlog/ui/components/button";
import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";
import { FilterChipTrigger } from "@lootlog/ui/components/filter-chip-trigger";
import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@/components/common/inline-search-field";
import {
  INLINE_SEARCH_SUGGESTION_CLASS,
  InlineSearchSuggestions,
} from "@/components/common/inline-search-suggestions";
import { cn } from "cn";

interface ActorNameSelectorProps {
  value: string;
  suggestions: string[];
  onValueChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  /** The filter's name for its chip in a filter bar. */
  label?: string;
  /**
   * A filter bar's leading search: a borderless field typed into in place,
   * with the suggestions listed under the whole field, instead of a button
   * that opens them with a search of their own.
   */
  inline?: boolean;
  className?: string;
}

export function ActorNameSelector({
  value,
  suggestions,
  onValueChange,
  searchValue,
  onSearchChange,
  placeholder,
  inline = false,
  label,
  className,
}: ActorNameSelectorProps) {
  const { t } = useTranslation();
  const inFilterBar = useInFilterBar();
  const [open, setOpen] = useState(false);
  const anchor = useComboboxAnchor();
  const customValue = searchValue.trim();

  const showCustomOption =
    customValue !== "" &&
    !suggestions.some(
      (suggestion) => suggestion.toLowerCase() === customValue.toLowerCase(),
    );

  const items = showCustomOption ? [...suggestions, customValue] : suggestions;

  const clear = () => {
    onValueChange("");
    onSearchChange("");
  };

  const suggestionsList = (
    <>
      <ComboboxEmpty>
        {customValue
          ? t("activityLogs.filters.suggestions.empty")
          : t("activityLogs.filters.suggestions.hint")}
      </ComboboxEmpty>
      <ComboboxList>
        {items.map((suggestion) => (
          <ComboboxItem
            key={suggestion}
            value={suggestion}
            className={inline ? INLINE_SEARCH_SUGGESTION_CLASS : undefined}
          >
            {showCustomOption && suggestion === customValue
              ? t("activityLogs.filters.suggestions.useCustom", {
                  value: customValue,
                })
              : suggestion}
          </ComboboxItem>
        ))}
      </ComboboxList>
    </>
  );

  return (
    <Combobox
      value={value || null}
      items={items}
      filteredItems={items}
      open={open}
      onOpenChange={setOpen}
      inputValue={searchValue}
      onInputValueChange={(nextValue, details) => {
        if (details.reason === "input-change") onSearchChange(nextValue);
      }}
      onValueChange={(nextValue) => {
        onValueChange(nextValue ?? "");
        onSearchChange(nextValue ?? "");
        setOpen(false);
      }}
    >
      {inline ? (
        <InlineSearchField
          ref={anchor}
          clearLabel={t("common.clear")}
          onClear={searchValue ? clear : undefined}
          className={className}
        >
          <ComboboxChipsInput
            type="search"
            aria-label={placeholder}
            placeholder={placeholder}
            className={INLINE_SEARCH_INPUT_CLASS}
          />
        </InlineSearchField>
      ) : inFilterBar && label ? (
        // Picking another name replaces the chosen one; the popup's search
        // clears it.
        <ComboboxTrigger
          render={
            <FilterChipTrigger
              icon={Search}
              label={label}
              value={value || undefined}
              active={Boolean(value)}
            />
          }
        />
      ) : (
        <div className={cn("relative", className)}>
          <ComboboxTrigger
            render={<Button variant="outline" size="lg" />}
            aria-label={placeholder}
            className={cn("w-full justify-between gap-2", value && "pr-10")}
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !value && "text-muted-foreground",
              )}
            >
              {value.length > 30
                ? `${value.slice(0, 30)}...`
                : value || placeholder}
            </span>
          </ComboboxTrigger>
          {Boolean(value) && (
            <ComboboxClear
              tabIndex={0}
              aria-label={t("common.clear")}
              className="absolute right-8 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
      )}
      {inline ? (
        <InlineSearchSuggestions anchor={anchor}>
          {suggestionsList}
        </InlineSearchSuggestions>
      ) : (
        <ComboboxContent align="start" className="w-[250px]">
          <ComboboxInput
            showTrigger={false}
            placeholder={t("activityLogs.filters.suggestions.inputPlaceholder")}
            aria-label={t("activityLogs.filters.suggestions.inputPlaceholder")}
          />
          {suggestionsList}
        </ComboboxContent>
      )}
    </Combobox>
  );
}
