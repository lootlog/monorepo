import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Search } from "lucide-react";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@lootlog/ui/components/combobox";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";

interface ActorNameSelectorProps {
  value: string;
  suggestions: string[];
  onValueChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function ActorNameSelector({
  value,
  suggestions,
  onValueChange,
  searchValue,
  onSearchChange,
  placeholder,
  className,
}: ActorNameSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const customValue = searchValue.trim();

  const showCustomOption =
    customValue !== "" &&
    !suggestions.some(
      (suggestion) => suggestion.toLowerCase() === customValue.toLowerCase(),
    );

  const items = showCustomOption ? [...suggestions, customValue] : suggestions;

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
      <div className={cn("relative", className)}>
        <ComboboxTrigger
          render={<Button variant="outline" />}
          aria-label={placeholder}
          className={cn("h-10 w-full justify-between gap-2", value && "pr-10")}
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
        <ComboboxClear
          tabIndex={0}
          aria-label={t("common.clear")}
          className="absolute right-8 top-1/2 -translate-y-1/2"
        />
      </div>
      <ComboboxContent className="w-[250px]" align="start">
        <ComboboxInput
          showTrigger={false}
          placeholder={t("activityLogs.filters.suggestions.inputPlaceholder")}
          aria-label={t("activityLogs.filters.suggestions.inputPlaceholder")}
        />
        <ComboboxEmpty>
          {customValue
            ? t("activityLogs.filters.suggestions.empty")
            : t("activityLogs.filters.suggestions.hint")}
        </ComboboxEmpty>
        <ComboboxList>
          {items.map((suggestion) => (
            <ComboboxItem key={suggestion} value={suggestion}>
              {showCustomOption && suggestion === customValue
                ? t("activityLogs.filters.suggestions.useCustom", {
                    value: customValue,
                  })
                : suggestion}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
