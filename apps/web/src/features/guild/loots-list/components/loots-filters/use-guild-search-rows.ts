import { useState } from "react";
import { isInScope, type GuildSearchScope } from "./loot-search-presentation";
import type { GuildSearchPage } from "./use-loot-search-command";

type ScopedGroup = Exclude<GuildSearchScope, "all">;

const SEARCH_GROUPS: readonly ScopedGroup[] = [
  "pages",
  "npcs",
  "items",
  "players",
];

type GuildSearchRowsInput = {
  trimmedSearch: string;
  pageResults: GuildSearchPage[];
  showSearchResults: boolean;
  npcValues: string[];
  itemValues: string[];
  playerValues: string[];
  hidValue: string | null;
  canSearchDirectly: boolean;
};

export const useGuildSearchRows = ({
  trimmedSearch,
  pageResults,
  showSearchResults,
  npcValues,
  itemValues,
  playerValues,
  hidValue,
  canSearchDirectly,
}: GuildSearchRowsInput) => {
  const [scope, setScope] = useState<GuildSearchScope>("all");
  const [selection, setSelection] = useState({ rowsKey: "", value: "" });

  const pageValues = pageResults.map((page) => `page-${page.id}`);

  const results = showSearchResults
    ? { npcs: npcValues, items: itemValues, players: playerValues }
    : { npcs: [], items: [], players: [] };

  const counts: Record<ScopedGroup, number> = {
    pages: trimmedSearch ? pageValues.length : 0,
    npcs: results.npcs.length,
    items: results.items.length,
    players: results.players.length,
  };

  const scopeOptions = SEARCH_GROUPS.flatMap((group) =>
    counts[group] > 0 ? [{ group, count: counts[group] }] : [],
  );

  const activeScope: GuildSearchScope =
    scope !== "all" && counts[scope] > 0 ? scope : "all";

  const showDirectSearch = canSearchDirectly && activeScope === "all";
  const inScope = (group: ScopedGroup) => isInScope(activeScope, group);

  const rowValues = [
    ...(inScope("pages") ? pageValues : []),
    ...(hidValue ? [hidValue] : []),
    ...(inScope("npcs") ? results.npcs : []),
    ...(inScope("items") ? results.items : []),
    ...(inScope("players") ? results.players : []),
    ...(showDirectSearch ? ["direct-search"] : []),
  ];

  const rowsKey = rowValues.join("\n");

  const selectedValue =
    selection.rowsKey === rowsKey ? selection.value : (rowValues[0] ?? "");

  return {
    activeScope,
    setScope,
    scopeOptions,
    showDirectSearch,
    selectedValue,
    selectValue: (value: string) => setSelection({ rowsKey, value }),
  };
};
