import { formatLevel } from "@lootlog/domain/profession";
import { useState } from "react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@lootlog/ui/components/combobox";
import { cn } from "cn";
import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@/components/common/inline-search-field";
import {
  INLINE_SEARCH_SUGGESTION_CLASS,
  InlineSearchSuggestions,
} from "@/components/common/inline-search-suggestions";
import { CharacterAvatar } from "@/components/filters/character-avatar";
import { useBattlesControllerSearchWarriors } from "@lootlog/client/battlelog";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type WarriorSearchFilterProps = {
  selectedWarriors: SearchWarrior[];
  onWarriorToggle: (warrior: SearchWarrior) => void;
  placeholder?: string;
  className?: string;
};

const MINIMUM_SEARCH_LENGTH = 2;

export const WarriorSearchFilter = ({
  selectedWarriors,
  onWarriorToggle,
  placeholder,
  className,
}: WarriorSearchFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  const anchor = useComboboxAnchor();
  const { t } = useTranslation();

  const { data: searchResponse, isFetching } =
    useBattlesControllerSearchWarriors(
      { q: debouncedQuery },
      {
        query: {
          enabled: debouncedQuery.length >= MINIMUM_SEARCH_LENGTH,
        },
      },
    );

  const searchResults =
    searchQuery.trim().length >= MINIMUM_SEARCH_LENGTH
      ? (searchResponse?.warriors ?? [])
      : [];

  const resultNames = searchResults.map((warrior) => warrior.name);
  const selectedNames = selectedWarriors.map((warrior) => warrior.name);

  const fieldPlaceholder =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : (placeholder ?? t("ui.warriorSearch.defaultPlaceholder"));

  const handleValueChange = (nextNames: string[]) => {
    const selected = new Set(selectedNames);
    const next = new Set(nextNames);
    const added = nextNames.find((name) => !selected.has(name));
    const removed = selectedNames.find((name) => !next.has(name));

    const warrior =
      searchResults.find((result) => result.name === added) ??
      selectedWarriors.find((selected) => selected.name === removed);

    if (warrior) onWarriorToggle(warrior);
    setSearchQuery("");
    setOpen(false);
  };

  const getEmptyLabel = () => {
    if (searchQuery.trim().length < MINIMUM_SEARCH_LENGTH) {
      return t("ui.warriorSearch.typeAtLeastTwoCharacters");
    }

    if (isFetching || debouncedQuery !== searchQuery.trim()) {
      return t("ui.warriorSearch.searching");
    }

    return t("ui.warriorSearch.empty");
  };

  return (
    <Combobox
      multiple
      value={selectedNames}
      items={resultNames}
      filteredItems={resultNames}
      open={open}
      onOpenChange={setOpen}
      inputValue={searchQuery}
      onInputValueChange={(nextValue, details) => {
        if (details.reason === "input-change") setSearchQuery(nextValue);
      }}
      onValueChange={handleValueChange}
    >
      <InlineSearchField
        ref={anchor}
        clearLabel={t("common.clear")}
        onClear={searchQuery ? () => setSearchQuery("") : undefined}
        className={className}
      >
        <ComboboxChipsInput
          type="search"
          aria-label={t("ui.warriorSearch.inputPlaceholder")}
          placeholder={fieldPlaceholder}
          className={cn(
            INLINE_SEARCH_INPUT_CLASS,
            selectedNames.length > 0 && "placeholder:text-foreground",
          )}
        />
      </InlineSearchField>
      <InlineSearchSuggestions anchor={anchor}>
        <ComboboxEmpty>{getEmptyLabel()}</ComboboxEmpty>
        <ComboboxList>
          {searchResults.map((warrior) => (
            <ComboboxItem
              key={warrior.name}
              value={warrior.name}
              className={INLINE_SEARCH_SUGGESTION_CLASS}
            >
              <CharacterAvatar icon={warrior.icon} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium">
                  {warrior.name}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatLevel(warrior.lvl, warrior.prof)}
                </span>
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </InlineSearchSuggestions>
    </Combobox>
  );
};
