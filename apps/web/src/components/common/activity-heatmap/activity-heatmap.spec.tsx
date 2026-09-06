// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n/config";
import { ActivityHeatmap } from "./activity-heatmap";

afterEach(cleanup);
describe("ActivityHeatmap", () => {
  it("names unknown and zero days separately and supports keyboard and touch details", () => {
    render(
      <ActivityHeatmap
        label="Bicia"
        days={[
          { date: "2026-09-01", value: null },
          { date: "2026-09-02", value: 0 },
          { date: "2026-09-03", value: 5 },
        ]}
        formatValue={(value) => `${value} bić`}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]?.getAttribute("aria-label")).toContain("Brak danych");
    expect(buttons[1]?.getAttribute("aria-label")).toContain("0 bić");
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    buttons[2]?.focus();
    fireEvent.keyDown(screen.getByRole("button", { name: /5 bić/ }), {
      key: "ArrowUp",
    });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.click(screen.getByRole("button", { name: /0 bić/ }));
    expect(
      document.querySelector("p[aria-live=polite]")?.textContent,
    ).toContain("środa, 2 września 2026: 0 bić");
  });
});

it("keeps a keyboard entry point after shrinking the period and refreshes selected values", () => {
  const formatValue = (value: number) => `${value} bić`;
  const { rerender } = render(
    <ActivityHeatmap
      label="Bicia"
      days={[
        { date: "2026-09-01", value: 1 },
        { date: "2026-09-02", value: 2 },
      ]}
      formatValue={formatValue}
    />,
  );
  const latest = screen.getByRole("button", { name: /2 bić/ });
  latest.focus();
  fireEvent.click(latest);
  rerender(
    <ActivityHeatmap
      label="Bicia"
      days={[{ date: "2026-09-02", value: 3 }]}
      formatValue={formatValue}
    />,
  );
  expect(screen.getByRole("button", { name: /3 bić/ }).tabIndex).toBe(0);
  expect(document.querySelector("p[aria-live=polite]")?.textContent).toContain(
    "3 bić",
  );
});
