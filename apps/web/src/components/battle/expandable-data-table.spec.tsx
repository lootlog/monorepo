// @vitest-environment happy-dom

import { createBattleWarrior } from "@/lib/testing/battle";
import type { BattleWarrior } from "@/lib/api/battlelog-types";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { ExpandableDataTable } from "./expandable-data-table";
import type { sortedTableFeatures } from "@/lib/tanstack-table-features";

await initializeTestTranslations();

afterEach(cleanup);

describe("ExpandableDataTable", () => {
  it("uses the shared expanded-detail table state for animated rows", () => {
    const columns: ColumnDef<typeof sortedTableFeatures, BattleWarrior>[] = [
      {
        accessorKey: "id",
        header: "ID",
      },
    ];

    render(
      <ExpandableDataTable
        columns={columns}
        data={[createBattleWarrior({ id: "warrior-1", damageTaken: 100 })]}
        expandedRows={new Map([["warrior-1", "damage"]])}
      />,
    );

    const detailRow = screen
      .getByText("battleUi.breakdowns.damageTaken.all")
      .closest("tr")
      ?.parentElement?.closest("tr");

    expect(detailRow?.getAttribute("data-state")).toBe("expanded-detail");
    expect(detailRow?.className).not.toContain("bg-secondary");
  });
});
