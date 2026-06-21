import { describe, expect, it } from "vitest";
import { getBattleTableSelectionState } from "./battle-table-selection-state";

describe("battle table selection state", () => {
  it("selects only rows inside the configured bulk action limit", () => {
    const state = getBattleTableSelectionState({
      battleIds: ["battle-1", "battle-2", "battle-3"],
      selectedBattleIds: new Set(["battle-1", "battle-2"]),
      selectionLimit: 2,
    });

    expect(state.selectableVisibleBattleIds).toEqual(["battle-1", "battle-2"]);
    expect(state.areAllSelectableRowsSelected).toBe(true);
    expect(state.headerCheckboxState).toBe(true);
  });

  it("keeps the header checkbox indeterminate for partial visible selection", () => {
    const state = getBattleTableSelectionState({
      battleIds: ["battle-1", "battle-2", "battle-3"],
      selectedBattleIds: new Set(["battle-3"]),
      selectionLimit: 2,
    });

    expect(state.areAllSelectableRowsSelected).toBe(false);
    expect(state.headerCheckboxState).toBe("indeterminate");
  });

  it("uses all visible rows when no selection limit is configured", () => {
    const state = getBattleTableSelectionState({
      battleIds: ["battle-1", "battle-2"],
      selectedBattleIds: new Set(["battle-1", "battle-2"]),
    });

    expect(state.effectiveSelectionLimit).toBe(2);
    expect(state.areAllSelectableRowsSelected).toBe(true);
  });
});
