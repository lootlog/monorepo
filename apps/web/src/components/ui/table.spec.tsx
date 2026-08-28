// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Table, TableBody, TableCell } from "@lootlog/ui/components/table";

afterEach(cleanup);

describe("Table expanded detail surface", () => {
  it("owns the expanded-detail surface for any descendant table row", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <tr data-state="expanded-detail">
            <TableCell>Details</TableCell>
          </tr>
        </TableBody>
      </Table>,
    );

    const table = container.querySelector("table");
    const detailRow = container.querySelector(
      'tr[data-state="expanded-detail"]',
    );

    expect(table?.className).toContain(
      "[&_tr[data-state=expanded-detail]]:bg-surface-selected",
    );
    expect(table?.className).toContain(
      "[&_tr[data-state=expanded-detail]]:hover:bg-surface-selected",
    );
    expect(detailRow).toBeTruthy();
  });
});
