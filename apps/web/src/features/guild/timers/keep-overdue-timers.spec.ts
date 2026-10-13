import { describe, expect, it } from "vitest";
import { keepOverdueTimers } from "./keep-overdue-timers";

const NOW = Date.parse("2026-10-14T12:00:00.000Z");

const timer = (timerKey: string, maxAgoMs: number) => ({
  guildId: "one",
  world: "tempest",
  timerKey,
  minSpawnTime: new Date(NOW - maxAgoMs - 60_000).toISOString(),
  maxSpawnTime: new Date(NOW - maxAgoMs).toISOString(),
});

describe("keepOverdueTimers", () => {
  it("keeps a timer the server stopped listing until the removal delay passes", () => {
    const active = timer("active", -60_000);
    const overdue = timer("overdue", 10_000);
    const removed = timer("removed", 31_000);

    expect(
      keepOverdueTimers([active], [active, overdue, removed], 30_000, NOW),
    ).toEqual([active, overdue]);
  });

  it("prefers the server's copy of a timer that was reset meanwhile", () => {
    const reset = timer("overdue", -120_000);

    expect(
      keepOverdueTimers([reset], [timer("overdue", 10_000)], 30_000, NOW),
    ).toEqual([reset]);
  });
});
