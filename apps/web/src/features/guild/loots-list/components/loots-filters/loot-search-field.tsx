import {
  Combobox,
  ComboboxChipsInput,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  useComboboxAnchor,
} from "@lootlog/ui/components/combobox";
import { upperFirst } from "es-toolkit";
import { useState } from "react";
import { cn } from "cn";
import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@/components/common/inline-search-field";
import {
  INLINE_SEARCH_SUGGESTION_CLASS,
  InlineSearchSuggestions,
} from "@/components/common/inline-search-suggestions";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import {
  LootSearchHitContent,
  type LootSearchHit,
} from "./loot-search-hit-content";
import { getPlayerRowValue } from "./loot-search-presentation";
import { useLootSearchCommand } from "./use-loot-search-command";

type Suggestion = { value: string; hit: LootSearchHit; select: () => void };

type SuggestionGroup = { label: string; suggestions: Suggestion[] };

/**
 * The loot list's own search: the Organization search narrowed to loots.
 * Typing lists matching monsters, items and players, or the item behind a
 * pasted HID, under the bar; picking one adds it to the list's filters and
 * clears the field for the next search.
 */
export const LootSearchField = () => {
  const [open, setOpen] = useState(false);
  const anchor = useComboboxAnchor();

  const {
    t,
    searchQuery,
    setSearchQuery,
    trimmedSearch,
    world,
    canSearchDirectly,
    handleDirectSearch,
    showKeepTyping,
    isHidInput,
    isHid,
    isHidLoading,
    isHidError,
    showHidNotFound,
    hidItem,
    handleSelectItemByHid,
    showSearchLoading,
    showSearchError,
    showSearchResults,
    npcResults,
    handleSelectNpc,
    itemResults,
    handleSelectItem,
    playerResults,
    handleSelectPlayer,
    showNoResults,
  } = useLootSearchCommand({ open, onOpenChange: setOpen });

  const allGroups: SuggestionGroup[] = [
    {
      label: t("loots.searchCommand.itemById"),
      suggestions:
        isHid && hidItem
          ? [
              {
                value: `hid-${hidItem.hid}`,
                hit: { kind: "hid", item: hidItem, term: trimmedSearch },
                select: () => handleSelectItemByHid(hidItem.hid),
              },
            ]
          : [],
    },
    {
      label: t("loots.searchCommand.npcs"),
      suggestions: showSearchResults
        ? npcResults.map((npc) => ({
            value: `npc-${npc.name}`,
            hit: { kind: "npc", npc },
            select: () => handleSelectNpc(npc),
          }))
        : [],
    },
    {
      label: t("loots.searchCommand.items"),
      suggestions: showSearchResults
        ? itemResults.map((item) => ({
            value: `item-${item.name}`,
            hit: { kind: "item", item },
            select: () => handleSelectItem(item),
          }))
        : [],
    },
    {
      label: world
        ? t("loots.searchCommand.playersOnWorld", { world: upperFirst(world) })
        : t("loots.searchCommand.players"),
      suggestions: showSearchResults
        ? playerResults.map((player) => ({
            value: getPlayerRowValue(player),
            hit: { kind: "player", player, world },
            select: () => handleSelectPlayer(player),
          }))
        : [],
    },
  ];

  const groups = allGroups.filter((group) => group.suggestions.length > 0);

  // First, so it is in view whatever the search service returns, and Enter
  // searches the typed text until another row is highlighted.
  const directSuggestion: Suggestion | null = canSearchDirectly
    ? {
        value: "direct-search",
        hit: { kind: "direct", term: trimmedSearch },
        select: handleDirectSearch,
      }
    : null;

  const suggestions = [
    ...(directSuggestion ? [directSuggestion] : []),
    ...groups.flatMap((group) => group.suggestions),
  ];

  const values = suggestions.map((suggestion) => suggestion.value);

  // Describes the service's hits, so it sits under the direct search.
  const statuses: [boolean, string][] = [
    [showKeepTyping, "loots.searchCommand.keepTyping"],
    [isHidInput && !isHid, "loots.searchCommand.hidInvalidTitle"],
    [isHid && isHidLoading, "loots.searchCommand.hidLoadingTitle"],
    [isHid && isHidError, "loots.searchCommand.hidErrorTitle"],
    [showHidNotFound, "loots.searchCommand.hidNotFoundTitle"],
    [showSearchLoading, "loots.searchCommand.loading"],
    [showSearchError, "common.searchUnavailable"],
    [showNoResults, "loots.searchCommand.noResults"],
  ];

  const statusKey = statuses.find(([applies]) => applies)?.[1];
  const status = statusKey ? t(statusKey) : null;

  return (
    <Combobox
      value={null}
      items={values}
      filteredItems={values}
      autoHighlight
      open={open && trimmedSearch !== ""}
      onOpenChange={setOpen}
      inputValue={searchQuery}
      onInputValueChange={(nextValue, details) => {
        if (details.reason === "input-change") setSearchQuery(nextValue);
      }}
      onValueChange={(value) =>
        suggestions.find((suggestion) => suggestion.value === value)?.select()
      }
    >
      <InlineSearchField
        ref={anchor}
        clearLabel={t("loots.searchBar.clear")}
        onClear={searchQuery ? () => setSearchQuery("") : undefined}
      >
        <ComboboxChipsInput
          type="search"
          aria-label={t("loots.searchBar.label")}
          placeholder={t("loots.searchBar.placeholder")}
          className={INLINE_SEARCH_INPUT_CLASS}
        />
      </InlineSearchField>
      <InlineSearchSuggestions anchor={anchor}>
        <ComboboxList className="max-h-[min(60dvh,30rem)]">
          {directSuggestion && (
            <ComboboxItem
              value={directSuggestion.value}
              className={INLINE_SEARCH_SUGGESTION_CLASS}
            >
              <LootSearchHitContent hit={directSuggestion.hit} />
            </ComboboxItem>
          )}
          {status && (
            <div
              role="status"
              className={cn(
                "flex min-h-12 items-center border-b border-sidebar-border text-sm text-muted-foreground last:border-b-0",
                LIST_TILE_INSET_CLASS,
              )}
            >
              {status}
            </div>
          )}
          {groups.map((group) => (
            <ComboboxGroup key={group.label}>
              <ComboboxLabel
                className={cn(
                  LIST_GROUP_HEADING_CLASS,
                  LIST_TILE_INSET_CLASS,
                  "py-0",
                )}
              >
                {group.label}
              </ComboboxLabel>
              {group.suggestions.map((suggestion) => (
                <ComboboxItem
                  key={suggestion.value}
                  value={suggestion.value}
                  className={INLINE_SEARCH_SUGGESTION_CLASS}
                >
                  <LootSearchHitContent hit={suggestion.hit} />
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </InlineSearchSuggestions>
    </Combobox>
  );
};
