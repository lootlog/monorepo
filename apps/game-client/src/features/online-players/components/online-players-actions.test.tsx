import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OnlinePlayersActions } from "./online-players-actions";

describe("OnlinePlayersActions", () => {
  it("toggles filters from the filters action", async () => {
    const user = userEvent.setup();
    const toggleViewMode = vi.fn<() => void>();
    const toggleFiltersVisible = vi.fn<() => void>();

    const { container } = render(
      <OnlinePlayersActions
        viewMode="accounts"
        toggleViewMode={toggleViewMode}
        filtersVisible
        toggleFiltersVisible={toggleFiltersVisible}
      />,
    );

    const filterIcon = container.querySelector("svg");

    if (!filterIcon) throw new Error("Expected filter icon");
    await user.click(filterIcon);

    expect(toggleFiltersVisible).toHaveBeenCalledTimes(1);
    expect(toggleViewMode).not.toHaveBeenCalled();
  });
});
