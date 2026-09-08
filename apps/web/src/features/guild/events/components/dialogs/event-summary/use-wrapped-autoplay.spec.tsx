// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useWrappedAutoplay } from "./use-wrapped-autoplay";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("advances with the latest committed callback without restarting the slide", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(performance, "now").mockReturnValue(0);
  const firstAdvance = vi.fn<() => void>();
  const latestAdvance = vi.fn<() => void>();
  const stageRef = { current: null };
  const { rerender } = renderHook(
    ({ onAdvance }) =>
      useWrappedAutoplay({
        activeSlideId: "opening",
        enabled: true,
        interactionEnabled: false,
        stageRef,
        onAdvance,
      }),
    { initialProps: { onAdvance: firstAdvance } },
  );

  rerender({ onAdvance: latestAdvance });
  expect(nextFrameId).toBe(1);
  act(() => {
    for (const callback of frames.values()) callback(8000);
  });

  expect(firstAdvance).not.toHaveBeenCalled();
  expect(latestAdvance).toHaveBeenCalledOnce();
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
