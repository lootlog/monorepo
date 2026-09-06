// @vitest-environment happy-dom
import {
  cleanup,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TanStackTableBody } from "./tanstack-table-body";

afterEach(cleanup);

it.each(["npcName", "npcType"])(
  "exposes %s as the row header while keeping numeric cells as data",
  (columnId) => {
    const { result } = renderHook(() =>
      useTable({
        features: coreTableFeatures,
        data: [{ identity: "Mushita", kills: 42 }],
        columns: [
          { id: columnId, accessorKey: "identity" },
          { accessorKey: "kills" },
        ],
      }),
    );
    const { rerender } = render(
      <Table>
        <TanStackTableBody
          table={result.current}
          rowHeaderColumnId={columnId}
        />
      </Table>,
    );
    const row = screen.getByRole("row");
    expect(
      within(row)
        .getByRole("rowheader", { name: "Mushita" })
        .getAttribute("scope"),
    ).toBe("row");
    expect(within(row).getByRole("cell", { name: "42" })).toBeTruthy();

    rerender(
      <Table>
        <TanStackTableBody table={result.current} />
      </Table>,
    );
    expect(screen.queryByRole("rowheader")).toBeNull();
    expect(screen.getByRole("cell", { name: "Mushita" })).toBeTruthy();
  },
);
