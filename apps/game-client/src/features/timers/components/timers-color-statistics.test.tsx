import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TimersColorStatistics } from "./timers-color-statistics";

describe("TimersColorStatistics", () => {
  it("shows an empty-state message when there are no color stats", async () => {
    render(<TimersColorStatistics colorStatistics={[]} />);

    await userEvent.hover(
      screen.getByRole("button", { name: "Statystyki kolorów timerów" }),
    );
    expect(await screen.findByText("Statystyki kolorów timerów")).toBeVisible();
    expect(screen.getByText("Brak ustawionych kolorów")).toBeVisible();
  });

  it("renders default and custom color summaries", async () => {
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

    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: "Statystyki kolorów timerów" }),
    ).toHaveFocus();
    expect(await screen.findByText("Red: 2/4")).toBeVisible();
    expect(screen.getByText("Custom One: 1/1")).toBeVisible();
  });
});
