export type BattleFilters = {
  world?: string;
  type?: Array<"solo" | "group">;
  search?: string;
  result?: Array<"won" | "lost" | "flee">;
  ph?: boolean;
  matchmaking?: boolean;
  characterId?: Array<string>;
  minLevel?: number;
  maxLevel?: number;
};

const toggleValue = <T>(values: T[] | undefined, value: T): T[] | undefined => {
  const next = values?.includes(value)
    ? values.filter((item) => item !== value)
    : [...(values ?? []), value];
  return next.length > 0 ? next : undefined;
};

export const createBattleFilterHandlers = (
  filters: BattleFilters,
  change: (filters: BattleFilters) => void,
) => ({
  handleCharacterChange: (value: string) =>
    change({
      ...filters,
      characterId: toggleValue(filters.characterId, value),
    }),
  handleTypeChange: (value: "solo" | "group") =>
    change({ ...filters, type: toggleValue(filters.type, value) }),
  handleResultChange: (value: "won" | "lost" | "flee") =>
    change({ ...filters, result: toggleValue(filters.result, value) }),
  handlePhToggle: (checked: boolean) =>
    change({ ...filters, ph: checked ? true : undefined }),
  handleMatchmakingToggle: (checked: boolean) =>
    change({ ...filters, matchmaking: checked ? true : undefined }),
  handleWorldChange: (value: string) =>
    change({ ...filters, world: filters.world === value ? undefined : value }),
  handleMinLevelChange: (value: number | undefined) =>
    change({ ...filters, minLevel: value }),
  handleMaxLevelChange: (value: number | undefined) =>
    change({ ...filters, maxLevel: value }),
});

export const toggleBattleSearchWarrior = <T extends { name: string }>(
  warriors: T[],
  warrior: T,
): T[] =>
  warriors.some((selected) => selected.name === warrior.name)
    ? warriors.filter((selected) => selected.name !== warrior.name)
    : [...warriors, warrior];
