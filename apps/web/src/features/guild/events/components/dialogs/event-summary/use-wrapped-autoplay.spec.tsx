// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useWrappedAutoplay } from "./use-wrapped-autoplay";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("advances with the latest committed callback before passive effects run", () => {
  let pendingFrame: FrameRequestCallback | undefined;
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pendingFrame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const firstAdvance = vi.fn();
  const nextAdvance = vi.fn();
  const { rerender } = renderHook(
    ({ onAdvance, finishFrame }) => {
      useWrappedAutoplay({
        activeSlideId: "opening",
        enabled: true,
        interactionEnabled: false,
        stageRef: { current: null },
        onAdvance,
      });
      useLayoutEffect(() => {
        if (!finishFrame) return;
        if (!pendingFrame) throw new Error("Expected a scheduled frame");
        pendingFrame(8000);
      }, [finishFrame]);
    },
    { initialProps: { onAdvance: firstAdvance, finishFrame: false } },
  );

  rerender({ onAdvance: nextAdvance, finishFrame: true });

  expect(firstAdvance).not.toHaveBeenCalled();
  expect(nextAdvance).toHaveBeenCalledOnce();
});
