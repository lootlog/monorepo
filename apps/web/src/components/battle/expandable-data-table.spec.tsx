// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { ExpandableDataTable } from "./expandable-data-table";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("./damage-breakdown", () => ({
  DamageBreakdown: () => <div>expanded-damage</div>,
}));

afterEach(cleanup);

describe("ExpandableDataTable", () => {
  it("uses the shared expanded-detail table state for animated rows", () => {
    type TestRow = { id: string };
    const columns: ColumnDef<TestRow>[] = [
      {
        accessorKey: "id",
        header: "ID",
      },
    ];

    render(
      <ExpandableDataTable
        columns={columns}
        data={[{ id: "warrior-1" }]}
        expandedRows={new Map([["warrior-1", "damage"]])}
      />,
    );

    const detailRow = screen.getByText("expanded-damage").closest("tr");

    expect(detailRow?.getAttribute("data-state")).toBe("expanded-detail");
    expect(detailRow?.className).not.toContain("bg-secondary");
  });
});
