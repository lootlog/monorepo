import { describe, expect, it } from "vitest";
import { getBattleSideCardScrollHandoff } from "./battle-side-card-scroll-handoff";

describe("getBattleSideCardScrollHandoff", () => {
  it("captures downward scroll for the outer page before it reaches bottom", () => {
    expect(
      getBattleSideCardScrollHandoff({
        deltaX: 0,
        deltaY: 120,
        outerClientHeight: 800,
        outerScrollHeight: 1600,
        outerScrollTop: 200,
      }),
    ).toEqual({
      shouldCapture: true,
      innerScrollDelta: 0,
      outerScrollDelta: 120,
    });
  });

  it("passes leftover scroll to the inner card when one gesture reaches page bottom", () => {
    expect(
      getBattleSideCardScrollHandoff({
        deltaX: 0,
        deltaY: 120,
        outerClientHeight: 800,
        outerScrollHeight: 1600,
        outerScrollTop: 730,
      }),
    ).toEqual({
      shouldCapture: true,
      innerScrollDelta: 50,
      outerScrollDelta: 70,
    });
  });

  it("does not capture when the outer page is already at bottom", () => {
    expect(
      getBattleSideCardScrollHandoff({
        deltaX: 0,
        deltaY: 120,
        outerClientHeight: 800,
        outerScrollHeight: 1600,
        outerScrollTop: 800,
      }),
    ).toEqual({
      shouldCapture: false,
      innerScrollDelta: 0,
      outerScrollDelta: 0,
    });
  });

  it("does not capture upward, horizontal, or modified wheel gestures", () => {
    const baseInput = {
      outerClientHeight: 800,
      outerScrollHeight: 1600,
      outerScrollTop: 200,
    };

    expect(
      getBattleSideCardScrollHandoff({
        ...baseInput,
        deltaX: 0,
        deltaY: -120,
      }).shouldCapture,
    ).toBe(false);
    expect(
      getBattleSideCardScrollHandoff({
        ...baseInput,
        deltaX: 140,
        deltaY: 120,
      }).shouldCapture,
    ).toBe(false);
    expect(
      getBattleSideCardScrollHandoff({
        ...baseInput,
        ctrlKey: true,
        deltaX: 0,
        deltaY: 120,
      }).shouldCapture,
    ).toBe(false);
  });
});
