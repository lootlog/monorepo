// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatPawLottie } from "./cat-paw-lottie";

vi.mock("lottie-react", () => ({
  Lottie: () => {
    throw new Error("Reduced-motion spinner must use a visible static icon");
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatPawLottie", () => {
  it("shows a static cat instead of the animation's blank first frame with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { container } = render(
      <CatPawLottie animationData={{}} className="size-8" />,
    );
    expect(container.firstElementChild?.classList.contains("size-8")).toBe(
      true,
    );
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 120 120",
    );
    expect(container.querySelector("svg path")).not.toBeNull();
  });
});
