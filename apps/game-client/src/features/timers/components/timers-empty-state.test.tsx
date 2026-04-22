import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimersEmptyState } from "./timers-empty-state";

describe("TimersEmptyState", () => {
  it("shows a dedicated message for active filters", () => {
    render(<TimersEmptyState areFiltersActive />);

    expect(
      screen.getByText("Brak timerów dla wybranych filtrów"),
    ).toBeVisible();
  });

  it("shows the generic empty message when no filters are active", () => {
    render(<TimersEmptyState areFiltersActive={false} />);

    expect(screen.getByText("Brak timerów")).toBeVisible();
  });
});
