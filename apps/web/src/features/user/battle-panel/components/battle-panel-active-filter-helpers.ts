import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import type { BattleFilters } from "../battle-panel-battles-list/components/battles-list-filters";
import {
  BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  isLevelRangeActive,
  normalizeBattlePanelLevelRange,
} from "./battle-panel-filter-state";

export type BattlePanelActiveFilterChipId =
  | "search"
  | "world"
  | "result"
  | "character"
  | "type"
  | "ph"
  | "matchmaking"
  | "level"
  | "period";

export type BattlePanelActiveFilterLabel = {
  id: BattlePanelActiveFilterChipId;
  label: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

type BattleListChipLabelInput = {
  filters: BattleFilters;
  formatWorld: (world: string) => string;
  selectedWarriorsCount: number;
  translate: Translate;
};

type HeadToHeadFilterState = {
  characterId?: string;
  matchmaking?: boolean;
  maxLevel?: number;
  minLevel?: number;
  period: Period;
  ph?: boolean;
  search?: string;
};

type HeadToHeadChipLabelInput = HeadToHeadFilterState & {
  selectedWarriorsCount: number;
  translate: Translate;
};

type PlayerVsPlayerFilterState = {
  matchmaking?: boolean;
  maxLevel?: number;
  minLevel?: number;
  period: Period;
  ph?: boolean;
};

type PlayerVsPlayerChipLabelInput = PlayerVsPlayerFilterState & {
  translate: Translate;
};

const getSelectionCount = (selection: readonly unknown[] | undefined) =>
  selection?.length ?? 0;

export const getResetBattleListFilters = (): BattleFilters => ({
  minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
});

export const getResetHeadToHeadFilters = (): Pick<
  HeadToHeadFilterState,
  "matchmaking" | "maxLevel" | "minLevel" | "period" | "ph" | "search"
> => ({
  period: "30d",
  minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  ph: undefined,
  matchmaking: undefined,
  search: undefined,
});

export const getResetPlayerVsPlayerFilters = (): PlayerVsPlayerFilterState => ({
  period: "30d",
  minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  ph: undefined,
  matchmaking: undefined,
});

export const removeBattleListFilter = (
  filters: BattleFilters,
  chipId: BattlePanelActiveFilterChipId,
): BattleFilters => {
  if (chipId === "search") {
    return { ...filters, search: undefined };
  }

  if (chipId === "world") {
    return { ...filters, world: undefined };
  }

  if (chipId === "result") {
    return { ...filters, result: undefined };
  }

  if (chipId === "character") {
    return { ...filters, characterId: undefined };
  }

  if (chipId === "type") {
    return { ...filters, type: undefined };
  }

  if (chipId === "ph") {
    return { ...filters, ph: undefined };
  }

  if (chipId === "matchmaking") {
    return { ...filters, matchmaking: undefined };
  }

  if (chipId === "level") {
    return {
      ...filters,
      minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
      maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
    };
  }

  return filters;
};

export const removeHeadToHeadFilter = (
  filters: HeadToHeadFilterState,
  chipId: BattlePanelActiveFilterChipId,
): HeadToHeadFilterState => {
  if (chipId === "search") {
    return { ...filters, search: undefined };
  }

  if (chipId === "character") {
    return { ...filters, characterId: undefined };
  }

  if (chipId === "period") {
    return { ...filters, period: "30d" };
  }

  if (chipId === "ph") {
    return { ...filters, ph: undefined };
  }

  if (chipId === "matchmaking") {
    return { ...filters, matchmaking: undefined };
  }

  if (chipId === "level") {
    return {
      ...filters,
      minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
      maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
    };
  }

  return filters;
};

export const removePlayerVsPlayerFilter = (
  filters: PlayerVsPlayerFilterState,
  chipId: BattlePanelActiveFilterChipId,
): PlayerVsPlayerFilterState => {
  if (chipId === "period") {
    return { ...filters, period: "30d" };
  }

  if (chipId === "ph") {
    return { ...filters, ph: undefined };
  }

  if (chipId === "matchmaking") {
    return { ...filters, matchmaking: undefined };
  }

  if (chipId === "level") {
    return {
      ...filters,
      minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
      maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
    };
  }

  return filters;
};

export const buildBattleListFilterLabels = ({
  filters,
  formatWorld,
  selectedWarriorsCount,
  translate,
}: BattleListChipLabelInput): BattlePanelActiveFilterLabel[] => {
  const chips: BattlePanelActiveFilterLabel[] = [];

  if (filters.search) {
    chips.push({
      id: "search",
      label: translate("battlePanel.filters.chips.search", {
        count: selectedWarriorsCount,
      }),
    });
  }

  if (filters.world) {
    chips.push({
      id: "world",
      label: translate("battlePanel.filters.chips.world", {
        value: formatWorld(filters.world),
      }),
    });
  }

  if (getSelectionCount(filters.result) > 0) {
    chips.push({
      id: "result",
      label: translate("battlePanel.filters.chips.result", {
        count: getSelectionCount(filters.result),
      }),
    });
  }

  if (getSelectionCount(filters.characterId) > 0) {
    chips.push({
      id: "character",
      label: translate("battlePanel.filters.chips.character", {
        count: getSelectionCount(filters.characterId),
      }),
    });
  }

  if (getSelectionCount(filters.type) > 0) {
    chips.push({
      id: "type",
      label: translate("battlePanel.filters.chips.type", {
        count: getSelectionCount(filters.type),
      }),
    });
  }

  if (filters.ph) {
    chips.push({
      id: "ph",
      label: translate("battlePanel.filters.chips.honorPoints"),
    });
  }

  if (filters.matchmaking) {
    chips.push({
      id: "matchmaking",
      label: translate("battlePanel.filters.chips.matchmaking"),
    });
  }

  if (isLevelRangeActive(filters)) {
    const normalizedRange = normalizeBattlePanelLevelRange(filters);

    chips.push({
      id: "level",
      label: translate("battlePanel.filters.chips.levelRange", {
        min: normalizedRange.minLevel,
        max: normalizedRange.maxLevel,
      }),
    });
  }

  return chips;
};

export const buildHeadToHeadFilterLabels = ({
  characterId,
  matchmaking,
  maxLevel,
  minLevel,
  period,
  ph,
  search,
  selectedWarriorsCount,
  translate,
}: HeadToHeadChipLabelInput): BattlePanelActiveFilterLabel[] => {
  const chips: BattlePanelActiveFilterLabel[] = [];

  if (search) {
    chips.push({
      id: "search",
      label: translate("battlePanel.filters.chips.search", {
        count: selectedWarriorsCount,
      }),
    });
  }

  if (characterId) {
    chips.push({
      id: "character",
      label: translate("battlePanel.filters.chips.character", { count: 1 }),
    });
  }

  if (period !== "30d") {
    chips.push({
      id: "period",
      label: translate("battlePanel.filters.chips.period", {
        value: translate(`battlePanel.filters.periodOptions.${period}`),
      }),
    });
  }

  if (ph) {
    chips.push({
      id: "ph",
      label: translate("battlePanel.filters.chips.honorPoints"),
    });
  }

  if (matchmaking) {
    chips.push({
      id: "matchmaking",
      label: translate("battlePanel.filters.chips.matchmaking"),
    });
  }

  if (isLevelRangeActive({ minLevel, maxLevel })) {
    const normalizedRange = normalizeBattlePanelLevelRange({
      minLevel,
      maxLevel,
    });

    chips.push({
      id: "level",
      label: translate("battlePanel.filters.chips.levelRange", {
        min: normalizedRange.minLevel,
        max: normalizedRange.maxLevel,
      }),
    });
  }

  return chips;
};

export const buildPlayerVsPlayerFilterLabels = ({
  matchmaking,
  maxLevel,
  minLevel,
  period,
  ph,
  translate,
}: PlayerVsPlayerChipLabelInput): BattlePanelActiveFilterLabel[] => {
  const chips: BattlePanelActiveFilterLabel[] = [];

  if (period !== "30d") {
    chips.push({
      id: "period",
      label: translate("battlePanel.filters.chips.period", {
        value: translate(`battlePanel.filters.periodOptions.${period}`),
      }),
    });
  }

  if (ph) {
    chips.push({
      id: "ph",
      label: translate("battlePanel.filters.chips.honorPoints"),
    });
  }

  if (matchmaking) {
    chips.push({
      id: "matchmaking",
      label: translate("battlePanel.filters.chips.matchmaking"),
    });
  }

  if (isLevelRangeActive({ minLevel, maxLevel })) {
    const normalizedRange = normalizeBattlePanelLevelRange({
      minLevel,
      maxLevel,
    });

    chips.push({
      id: "level",
      label: translate("battlePanel.filters.chips.levelRange", {
        min: normalizedRange.minLevel,
        max: normalizedRange.maxLevel,
      }),
    });
  }

  return chips;
};
