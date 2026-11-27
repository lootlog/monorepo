import { describe, expect, it } from "vitest";
import { resolveMobileMode } from "./use-mobile-mode";

describe("resolveMobileMode", () => {
  it("enables portrait mobile mode on narrow viewports in auto mode", () => {
    expect(
      resolveMobileMode({
        setting: "auto",
        viewport: { width: 390, height: 844, scale: 1 },
        coarsePointer: true,
      }),
    ).toEqual({
      isMobile: true,
      orientation: "portrait",
      coarsePointer: true,
    });
  });

  it("enables landscape mobile mode on coarse-pointer phone dimensions in auto mode", () => {
    expect(
      resolveMobileMode({
        setting: "auto",
        viewport: { width: 844, height: 390, scale: 1 },
        coarsePointer: true,
      }),
    ).toEqual({
      isMobile: true,
      orientation: "landscape",
      coarsePointer: true,
    });
  });

  it("keeps desktop mode on fine-pointer desktop windows in auto mode even when narrow", () => {
    expect(
      resolveMobileMode({
        setting: "auto",
        viewport: { width: 800, height: 600, scale: 1 },
        coarsePointer: false,
      }),
    ).toEqual({
      isMobile: false,
      orientation: "landscape",
      coarsePointer: false,
    });

    expect(
      resolveMobileMode({
        setting: "auto",
        viewport: { width: 390, height: 844, scale: 1 },
        coarsePointer: false,
      }).isMobile,
    ).toBe(false);
  });

  it("unscales zoomed game viewports before deciding mobile mode", () => {
    expect(
      resolveMobileMode({
        setting: "auto",
        viewport: { width: 780, height: 1688, scale: 2 },
        coarsePointer: true,
      }),
    ).toEqual({
      isMobile: true,
      orientation: "portrait",
      coarsePointer: true,
    });
  });

  it("honors explicit on and off overrides regardless of viewport", () => {
    expect(
      resolveMobileMode({
        setting: "on",
        viewport: { width: 1920, height: 1080, scale: 1 },
        coarsePointer: false,
      }).isMobile,
    ).toBe(true);

    expect(
      resolveMobileMode({
        setting: "off",
        viewport: { width: 375, height: 667, scale: 1 },
        coarsePointer: true,
      }).isMobile,
    ).toBe(false);
  });
});
