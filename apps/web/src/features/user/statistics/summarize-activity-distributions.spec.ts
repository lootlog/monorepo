import { expect, it } from "vitest";
import { summarizeActivityDistributions } from "./summarize-activity-distributions";

it("sums each of the 168 cells once into both distributions", () => {
  const cells = Array.from({ length: 168 }, (_, index) => ({
    weekday: Math.floor(index / 24) + 1,
    hour: index % 24,
    kills: index + 1,
  }));
  const distributions = summarizeActivityDistributions(cells);
  const total = cells.reduce((sum, cell) => sum + cell.kills, 0);
  expect(distributions.hourly).toHaveLength(24);
  expect(distributions.weekdays).toHaveLength(7);
  expect(distributions.hourly.reduce((sum, row) => sum + row.kills, 0)).toBe(
    total,
  );
  expect(distributions.weekdays.reduce((sum, row) => sum + row.kills, 0)).toBe(
    total,
  );
  expect(distributions.hourly[0]).toEqual({ hour: 0, kills: 511 });
  expect(distributions.weekdays[0]).toEqual({ weekday: 1, kills: 300 });
});

it("retains known inactive hours and Monday-first weekdays", () => {
  const distributions = summarizeActivityDistributions([
    { weekday: 7, hour: 23, kills: 4 },
  ]);
  expect(distributions.hourly[0]).toEqual({ hour: 0, kills: 0 });
  expect(distributions.hourly[23]).toEqual({ hour: 23, kills: 4 });
  expect(distributions.weekdays[0]).toEqual({ weekday: 1, kills: 0 });
  expect(distributions.weekdays[6]).toEqual({ weekday: 7, kills: 4 });
});
