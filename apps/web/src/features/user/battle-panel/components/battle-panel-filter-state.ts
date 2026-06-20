export const BATTLE_PANEL_DEFAULT_MIN_LEVEL = 1;
export const BATTLE_PANEL_DEFAULT_MAX_LEVEL = 500;

type LevelRangeFilters = {
  minLevel?: number;
  maxLevel?: number;
};

type PaginationRangeInput = {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  visibleCount: number;
};

export const isLevelRangeActive = ({
  minLevel,
  maxLevel,
}: LevelRangeFilters) => {
  return (
    (minLevel ?? BATTLE_PANEL_DEFAULT_MIN_LEVEL) !==
      BATTLE_PANEL_DEFAULT_MIN_LEVEL ||
    (maxLevel ?? BATTLE_PANEL_DEFAULT_MAX_LEVEL) !==
      BATTLE_PANEL_DEFAULT_MAX_LEVEL
  );
};

export const normalizeBattlePanelLevelRange = ({
  minLevel,
  maxLevel,
}: LevelRangeFilters) => {
  return {
    minLevel: minLevel ?? BATTLE_PANEL_DEFAULT_MIN_LEVEL,
    maxLevel: maxLevel ?? BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  };
};

export const getPaginationDisplayRange = ({
  pageIndex,
  pageSize,
  totalCount,
  visibleCount,
}: PaginationRangeInput) => {
  if (totalCount <= 0 || visibleCount <= 0) {
    return {
      from: 0,
      to: 0,
    };
  }

  const from = pageIndex * pageSize + 1;
  const cappedFrom = Math.min(from, totalCount);
  const to = Math.min(cappedFrom + visibleCount - 1, totalCount);

  return {
    from: cappedFrom,
    to,
  };
};
