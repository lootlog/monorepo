import { formatLevel } from "@lootlog/domain/profession";
import { useState } from "react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
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
import { CharacterAvatar } from "@/components/filters/character-avatar";
import {
  getBattlesControllerSearchWarriorsQueryKey,
  useBattlesControllerSearchWarriors,
} from "@lootlog/client/battlelog";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type WarriorSearchFilterProps = {
  selectedWarriors: SearchWarrior[];
  onWarriorToggle: (warrior: SearchWarrior) => void;
  placeholder?: string;
  className?: string;
};

const MINIMUM_SEARCH_LENGTH = 2;

/**
 * The filter bar's leading search: a borderless field typed into in place,
 * like a list toolbar's filter, with the matching warriors listed under it.
 * Picking a warrior toggles it and clears the field for the next one.
 */
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
          queryKey: getBattlesControllerSearchWarriorsQueryKey({
            q: debouncedQuery,
          }),
        },
      },
    );

  const searchResults =
    searchQuery.trim().length >= MINIMUM_SEARCH_LENGTH
      ? (searchResponse?.warriors ?? [])
      : [];

  const resultNames = searchResults.map((warrior) => warrior.name);
  const selectedNames = selectedWarriors.map((warrior) => warrior.name);

  // Selected warriors are restored from the URL by name only, so the field
  // names them instead of showing a sprite, level or profession.
  const fieldPlaceholder =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : (placeholder ?? t("ui.warriorSearch.defaultPlaceholder"));

  const handleValueChange = (nextNames: string[]) => {
    const added = nextNames.find((name) => !selectedNames.includes(name));
    const removed = selectedNames.find((name) => !nextNames.includes(name));

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
      <ComboboxContent
        anchor={anchor}
        className="max-w-[min(24rem,calc(100vw-2rem))]"
      >
        <ComboboxEmpty>{getEmptyLabel()}</ComboboxEmpty>
        <ComboboxList>
          {searchResults.map((warrior) => (
            <ComboboxItem
              key={warrior.name}
              value={warrior.name}
              className="min-h-12 gap-3 px-2"
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
      </ComboboxContent>
    </Combobox>
  );
};
