import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimersEmptyState } from "./timers-empty-state";

describe("TimersEmptyState", () => {
  it("shows a dedicated message and reset action for active filters", async () => {
    const user = userEvent.setup();
    const onResetFilters = vi.fn();
    render(
      <TimersEmptyState areFiltersActive onResetFilters={onResetFilters} />,
    );

    expect(screen.getByText("Brak pasujących timerów")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
    expect(onResetFilters).toHaveBeenCalledOnce();
  });

  it("shows the generic empty message when no filters are active", () => {
    render(
      <TimersEmptyState areFiltersActive={false} onResetFilters={vi.fn()} />,
    );

    expect(screen.getByText("Brak timerów")).toBeVisible();
    expect(screen.getByRole("status")).toHaveClass(
      "ll:box-border",
      "ll:h-full",
      "ll:items-center",
      "ll:justify-center",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
