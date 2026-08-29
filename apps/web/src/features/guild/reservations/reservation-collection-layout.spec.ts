import { describe, expect, it } from "vitest";
import { getReservationCollectionClassName } from "./reservation-collection-layout";

describe("getReservationCollectionClassName", () => {
  it("keeps grid rows contiguous and lets cards share the row height", () => {
    expect(getReservationCollectionClassName("grid")).not.toContain(
      "items-start",
    );
  });

  it("keeps list cards in a single vertical stack", () => {
    expect(getReservationCollectionClassName("list")).toBe(
      "flex flex-col gap-3 px-3 pb-3",
    );
  });
});
