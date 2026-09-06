// @vitest-environment happy-dom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import animationData from "../../../public/lottie/cat-paw-loading.json";
import { CatPawLottie } from "./cat-paw-lottie";

const { playback } = vi.hoisted(() => ({
  playback: vi.fn(),
}));

vi.mock("lottie-react", () => ({
  Lottie: playback,
}));

afterEach(() => {
  cleanup();
  playback.mockReset();
  vi.unstubAllGlobals();
});

describe("CatPawLottie", () => {
  it("limits automatic motion to five seconds and keeps a visible indicator after completion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    playback.mockReturnValue(null);
    const { container } = render(
      <CatPawLottie animationData={animationData} />,
    );
    const options = playback.mock.calls[0]?.[0];
    expect(options.autoplay).toBe(true);
    expect(typeof options.loop).toBe("number");
    const duration = (animationData.op - animationData.ip) / animationData.fr;
    expect(duration * (options.loop + 1)).toBeLessThanOrEqual(5);

    act(() => options.subscriptions.complete());

    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("shows a static cat instead of the animation's blank first frame with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { container } = render(
      <CatPawLottie animationData={{}} className="size-8" />,
    );
    expect(playback).not.toHaveBeenCalled();
    expect(container.firstElementChild?.classList.contains("size-8")).toBe(
      true,
    );
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 120 120",
    );
    expect(container.querySelector("svg path")).not.toBeNull();
  });
});
