import { dateToTemporal } from "#src/db/temporal";
import { resolveEventWindowStart } from "./resolve-event-window-start.util.js";

describe("resolveEventWindowStart", () => {
  it("compares database temporal values as dates", () => {
    const killedAt = new Date("2026-09-01T10:00:00.000Z");
    const result = resolveEventWindowStart({
      killedAt: dateToTemporal(killedAt),
      minSpawnTimeAtKill: dateToTemporal(new Date("2026-09-01T09:00:00.000Z")),
      windowOpenedAt: dateToTemporal(new Date("2026-09-01T11:00:00.000Z")),
    });

    expect(result).toEqual(killedAt);
  });
});
