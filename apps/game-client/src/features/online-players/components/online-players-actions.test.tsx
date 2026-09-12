import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OnlinePlayersActions } from "./online-players-actions";

describe("OnlinePlayersActions", () => {
  it("toggles filters from the keyboard-reachable filters action", async () => {
    const user = userEvent.setup();
    const toggleViewMode = vi.fn<() => void>();
    const toggleFiltersVisible = vi.fn<() => void>();

    render(
      <OnlinePlayersActions
        viewMode="accounts"
        toggleViewMode={toggleViewMode}
        filtersVisible
        toggleFiltersVisible={toggleFiltersVisible}
      />,
    );

    const filters = screen.getByRole("button", { name: "Ukryj filtry" });

    expect(filters).toHaveAttribute("aria-pressed", "true");

    filters.focus();
    await user.keyboard("{Enter}");

    expect(toggleFiltersVisible).toHaveBeenCalledTimes(1);
    expect(toggleViewMode).not.toHaveBeenCalled();
  });
});
