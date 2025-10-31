import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimersColorStatistics } from "./timers-color-statistics";

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

  it("should render info icon", () => {
    const { container } = render(
      <TimersColorStatistics colorStatistics={[]} />,
    );

    const infoIcon = container.querySelector("svg");
    expect(infoIcon).toBeDefined();
  });

  it("should render with custom background and border colors", () => {
    const colorStatistics = [
      {
        color: "custom1",
        total: 3,
        active: 2,
        name: "My Custom Color",
        bgColor: "#ff0000",
        borderColor: "#cc0000",
      },
    ];

    const { container } = render(
      <TimersColorStatistics colorStatistics={colorStatistics} />,
    );

    const colorDiv = container.querySelector('div[style*="#ff0000"]');
    expect(colorDiv).toBeDefined();
  });

  it("should show title", () => {
    render(<TimersColorStatistics colorStatistics={[]} />);

    expect(screen.getByText("Statystyki kolorów timerów")).toBeDefined();
  });
});
