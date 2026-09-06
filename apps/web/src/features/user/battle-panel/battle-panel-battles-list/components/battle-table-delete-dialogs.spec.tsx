// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BattleTableDeleteDialogs } from "./battle-table-delete-dialogs";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);

it("keeps confirmation open after submission and allows retry after pending ends", () => {
  const onBulkDelete = vi.fn();
  const onBulkDeleteOpenChange = vi.fn();
  const props = {
    isBulkDeleteDialogOpen: true,
    isDeletePending: false,
    onBulkDelete,
    onBulkDeleteOpenChange,
    onSingleDelete: vi.fn(),
    onSingleDeleteOpenChange: vi.fn(),
    selectedCount: 2,
    singleDeleteBattle: null,
  };
  const { rerender } = render(<BattleTableDeleteDialogs {...props} />);
  const confirm = () =>
    screen.getByRole("button", {
      name: "battlePanel.bulk.deleteDialog.confirm",
    });
  fireEvent.click(confirm());
  expect(onBulkDelete).toHaveBeenCalledTimes(1);
  expect(onBulkDeleteOpenChange).not.toHaveBeenCalled();
  rerender(<BattleTableDeleteDialogs {...props} isDeletePending />);
  expect(confirm().getAttribute("aria-busy")).toBe("true");
  fireEvent.click(confirm());
  fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
  expect(onBulkDelete).toHaveBeenCalledTimes(1);
  expect(onBulkDeleteOpenChange).not.toHaveBeenCalled();
  rerender(<BattleTableDeleteDialogs {...props} />);
  fireEvent.click(confirm());
  expect(onBulkDelete).toHaveBeenCalledTimes(2);
});
