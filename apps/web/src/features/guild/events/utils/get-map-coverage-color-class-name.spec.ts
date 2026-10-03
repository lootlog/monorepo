import { describe, expect, it } from "vitest";
import {
  getCoveredMapsColorClassName,
  getMapCoverageColorClassName,
} from "./get-map-coverage-color-class-name";

describe("getMapCoverageColorClassName", () => {
  it.each([
    [49, "text-signal-alert"],
    [50, "text-signal-timer"],
    [89, "text-signal-timer"],
    [90, "text-signal-ready"],
  ])("maps %i%% coverage to %s", (coveragePercent, expectedClassName) => {
    expect(getMapCoverageColorClassName(coveragePercent)).toBe(
      expectedClassName,
    );
  });
});

describe("getCoveredMapsColorClassName", () => {
  it.each([
    [3, 3, "text-signal-ready"],
    [2, 3, "text-signal-timer"],
    [0, 3, "text-signal-alert"],
  ])(
    "maps %i of %i covered maps to %s",
    (coveredMapsCount, totalMapsCount, expectedClassName) => {
      expect(
        getCoveredMapsColorClassName(coveredMapsCount, totalMapsCount),
      ).toBe(expectedClassName);
    },
  );
});
