type BattleTableSelectionStateParams = {
  battleIds: string[];
  selectedBattleIds: Set<string>;
  selectionLimit?: number;
};

export type BattleTableSelectionState = {
  areAllSelectableRowsSelected: boolean;
  effectiveSelectionLimit: number;
  headerCheckboxState: boolean | "indeterminate";
  selectableVisibleBattleIds: string[];
};

export function getBattleTableSelectionState({
  battleIds,
  selectedBattleIds,
  selectionLimit,
}: BattleTableSelectionStateParams): BattleTableSelectionState {
  const effectiveSelectionLimit = selectionLimit ?? battleIds.length;
  const selectableVisibleBattleIds = battleIds.slice(
    0,
    effectiveSelectionLimit,
  );
  const selectedVisibleCount = battleIds.filter((battleId) =>
    selectedBattleIds.has(battleId),
  ).length;
  const selectedSelectableVisibleCount = selectableVisibleBattleIds.filter(
    (battleId) => selectedBattleIds.has(battleId),
  ).length;
  const areAllSelectableRowsSelected =
    selectableVisibleBattleIds.length > 0 &&
    selectedSelectableVisibleCount === selectableVisibleBattleIds.length;
  let headerCheckboxState: boolean | "indeterminate" = false;

  if (areAllSelectableRowsSelected) {
    headerCheckboxState = true;
  } else if (selectedVisibleCount > 0) {
    headerCheckboxState = "indeterminate";
  }

  return {
    areAllSelectableRowsSelected,
    effectiveSelectionLimit,
    headerCheckboxState,
    selectableVisibleBattleIds,
  };
}
