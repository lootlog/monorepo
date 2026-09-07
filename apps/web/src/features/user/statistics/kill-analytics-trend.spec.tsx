// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KillAnalyticsTrend } from "./kill-analytics-trend";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

it("keeps incomplete intervals identifiable in table view", () => {
  render(
    <KillAnalyticsTrend
      title="Weekly kills"
      data={[
        { date: "2026-08-03", kills: 12, partial: true },
        { date: "2026-08-10", kills: 34, partial: false },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "statistics.table" }));
  const table = screen.getByRole("table", { name: "Weekly kills" });
  const partialRow = within(table).getByRole("row", { name: /2026-08-03/ });
  const completeRow = within(table).getByRole("row", { name: /2026-08-10/ });
  expect(within(partialRow).getByText("statistics.partial")).toBeDefined();
  expect(within(completeRow).queryByText("statistics.partial")).toBeNull();
  expect(within(partialRow).getByRole("cell").textContent).toBe("12");
  fireEvent.click(screen.getByRole("button", { name: "statistics.chart" }));
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByRole("img", { name: "Weekly kills" })).toBeDefined();
});
