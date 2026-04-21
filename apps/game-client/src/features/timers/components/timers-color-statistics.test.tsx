import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Info: () => <span>Info</span>,
}));

import { TimersColorStatistics } from "./timers-color-statistics";

describe("TimersColorStatistics", () => {
  it("shows an empty-state message when there are no color stats", () => {
    render(<TimersColorStatistics colorStatistics={[]} />);

    expect(screen.getByText("Statystyki kolorów timerów")).toBeVisible();
    expect(screen.getByText("Brak ustawionych kolorów")).toBeVisible();
  });

  it("renders default and custom color summaries", () => {
    render(
      <TimersColorStatistics
        colorStatistics={[
          { color: "red", total: 4, active: 2, name: "Red" },
          {
            color: "custom-1",
            total: 1,
            active: 1,
            name: "Custom One",
            bgColor: "#111",
            borderColor: "#222",
          },
        ]}
      />,
    );

    expect(screen.getByText("Red: 2/4")).toBeVisible();
    expect(screen.getByText("Custom One: 1/1")).toBeVisible();
  });
});
