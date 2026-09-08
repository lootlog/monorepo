// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useWrappedAutoplay } from "./use-wrapped-autoplay";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
