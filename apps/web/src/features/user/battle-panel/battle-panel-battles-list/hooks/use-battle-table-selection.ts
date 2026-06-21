import type { Battle } from "@/lib/api/battlelog-types";
import { useEffect, useState } from "react";
import { getBattleTableSelectionState } from "../utils/battle-table-selection-state";

type UseBattleTableSelectionParams = {
  battles: Battle[];
  onSelectionLimitReached: (limit: number) => void;
  selectionLimit?: number;
};

export const useBattleTableSelection = ({
  battles,
  onSelectionLimitReached,
  selectionLimit,
}: UseBattleTableSelectionParams) => {
  const [selectedBattleIds, setSelectedBattleIds] = useState<Set<string>>(
    () => new Set(),
  );

  const battleIdsFingerprint = battles.map((battle) => battle.id).join(",");
  const selectedBattles = battles.filter((battle) =>
    selectedBattleIds.has(battle.id),
  );
  const visibleBattleIds = battles.map((battle) => battle.id);
  const {
    areAllSelectableRowsSelected,
    effectiveSelectionLimit,
    headerCheckboxState,
    selectableVisibleBattleIds,
  } = getBattleTableSelectionState({
    battleIds: visibleBattleIds,
    selectedBattleIds,
    selectionLimit,
  });

  useEffect(() => {
    setSelectedBattleIds(new Set());
  }, [battleIdsFingerprint]);

  const handleSelectionChange = (battleId: string, checked: boolean) => {
    if (
      checked &&
      !selectedBattleIds.has(battleId) &&
      selectedBattleIds.size >= effectiveSelectionLimit
    ) {
      onSelectionLimitReached(effectiveSelectionLimit);
      return;
    }

    setSelectedBattleIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (checked) {
        nextSelection.add(battleId);
        return nextSelection;
      }

      nextSelection.delete(battleId);
      return nextSelection;
    });
  };

  const handleHeaderSelectionChange = (checked: boolean) => {
    if (!checked || areAllSelectableRowsSelected) {
      setSelectedBattleIds(new Set());
      return;
    }

    setSelectedBattleIds(new Set(selectableVisibleBattleIds));
  };

  const clearSelection = () => {
    setSelectedBattleIds(new Set());
  };

  const removeBattleFromSelection = (battleId: string) => {
    setSelectedBattleIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      nextSelection.delete(battleId);
      return nextSelection;
    });
  };

  return {
    areAllSelectableRowsSelected,
    clearSelection,
    handleHeaderSelectionChange,
    handleSelectionChange,
    hasSelectedBattles: selectedBattles.length > 0,
    headerCheckboxState,
    removeBattleFromSelection,
    selectedBattleIds,
    selectedBattles,
  };
};
