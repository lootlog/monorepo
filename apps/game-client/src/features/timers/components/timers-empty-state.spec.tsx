import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimersEmptyState } from "./timers-empty-state";

describe("TimersEmptyState", () => {
  it("should show default message when filters are not active", () => {
    render(<TimersEmptyState areFiltersActive={false} />);

    expect(screen.getByText("----")).toBeDefined();
  });

  it("should show filtered message when filters are active", () => {
    render(<TimersEmptyState areFiltersActive={true} />);

    expect(
      screen.getByText("Brak timerów dla wybranych filtrów"),
    ).toBeDefined();
  });
});
