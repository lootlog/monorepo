import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OnlinePlayersActions } from "./online-players-actions";

vi.mock("lucide-react", () => ({
  Filter: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="Filter">
      Filter
    </button>
  ),
  List: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="List">
      List
    </button>
  ),
  MapPinned: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="MapPinned">
      MapPinned
    </button>
  ),
}));

describe("OnlinePlayersActions", () => {
  it("toggles filters from the filters action", async () => {
    const user = userEvent.setup();
    const toggleViewMode = vi.fn();
    const toggleFiltersVisible = vi.fn();

    render(
      <OnlinePlayersActions
        viewMode="accounts"
        toggleViewMode={toggleViewMode}
        filtersVisible
        toggleFiltersVisible={toggleFiltersVisible}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter" }));

    expect(toggleFiltersVisible).toHaveBeenCalledTimes(1);
    expect(toggleViewMode).not.toHaveBeenCalled();
  });
});
