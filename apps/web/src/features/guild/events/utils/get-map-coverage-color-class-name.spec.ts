import { describe, expect, it } from "vitest";
import { getMapCoverageColorClassName } from "./get-map-coverage-color-class-name";

describe("getMapCoverageColorClassName", () => {
  it.each([
    [49, "text-destructive"],
    [50, "text-amber-500"],
    [89, "text-amber-500"],
    [90, "text-green-500"],
  ])("maps %i%% coverage to %s", (coveragePercent, expectedClassName) => {
    expect(getMapCoverageColorClassName(coveragePercent)).toBe(
      expectedClassName,
    );
  });
});
