import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimersColorStatistics } from "./timers-color-statistics";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

describe("TimersColorStatistics", () => {
  it("should render empty state when no color statistics", () => {
    render(<TimersColorStatistics colorStatistics={[]} />);

    expect(screen.getByText("Brak ustawionych kolorów")).toBeDefined();
  });

  it("should render color statistics", () => {
    const colorStatistics = [
      {
        color: "red",
        total: 5,
        active: 3,
        name: "Czerwony",
      },
      {
        color: "blue",
        total: 2,
        active: 1,
        name: "Niebieski",
      },
    ];

    render(<TimersColorStatistics colorStatistics={colorStatistics} />);

    expect(screen.getByText(/Czerwony: 3\/5/)).toBeDefined();
    expect(screen.getByText(/Niebieski: 1\/2/)).toBeDefined();
  });

  it("should show title", () => {
    render(<TimersColorStatistics colorStatistics={[]} />);

    expect(screen.getByText("Statystyki kolorów timerów")).toBeDefined();
  });
});
