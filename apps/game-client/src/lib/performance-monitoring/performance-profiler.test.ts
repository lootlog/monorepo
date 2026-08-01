import { expect, it, vi } from "vitest";

const performanceMocks = vi.hoisted(() => ({
  recordPerformance: vi.fn(),
}));

vi.mock("./performance-monitor", () => performanceMocks);

import { recordReactProfilerCommit } from "./performance-profiler";

it("records React commit timing without component props or DOM selectors", () => {
  recordReactProfilerCommit("feature.npc-detector", "update", 12, 20, 100, 115);

  expect(performanceMocks.recordPerformance).toHaveBeenCalledWith({
    category: "react",
    data: {
      baseDurationMs: 20,
      commitTimeMs: 115,
      phase: "update",
      startTimeMs: 100,
    },
    durationMs: 12,
    name: "react.commit.feature.npc-detector",
  });
});
