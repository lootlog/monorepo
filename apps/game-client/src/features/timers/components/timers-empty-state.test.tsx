import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimersEmptyState } from "./timers-empty-state";

describe("TimersEmptyState", () => {
  it("shows a dedicated message and reset action for active filters", async () => {
    const user = userEvent.setup();
    const onResetFilters = vi.fn<() => void>();
    render(
      <TimersEmptyState areFiltersActive onResetFilters={onResetFilters} />,
    );

    expect(screen.getByText("Żaden timer nie pasuje do filtrów")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
    expect(onResetFilters).toHaveBeenCalledOnce();
  });

  it("shows the generic empty message when no filters are active", () => {
    render(
      <TimersEmptyState
        areFiltersActive={false}
        onResetFilters={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("Nie ma jeszcze timerów")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
