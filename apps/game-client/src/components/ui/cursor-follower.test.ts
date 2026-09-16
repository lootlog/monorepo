import { afterEach, expect, it, vi } from "vitest";
import {
  ensureCursorTracking,
  registerCursorFollower,
} from "./cursor-follower";

const OFFSETS = { sideOffset: 14, alignOffset: 6, padding: 8 };

afterEach(() => {
  vi.restoreAllMocks();
});

it("places an open tooltip on every pointer move without measuring it again", () => {
  let scheduledFrame: FrameRequestCallback | null = null;

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    scheduledFrame = callback;

    return 1;
  });

  const runScheduledFrame = () => {
    const frame = scheduledFrame;
    scheduledFrame = null;
    frame?.(16);
  };

  const element = document.createElement("div");
  const offsetWidth = vi.fn(() => 120);
  const offsetHeight = vi.fn(() => 40);
  Object.defineProperty(element, "offsetWidth", { get: offsetWidth });
  Object.defineProperty(element, "offsetHeight", { get: offsetHeight });
  document.body.append(element);

  ensureCursorTracking();
  const unregister = registerCursorFollower(element, OFFSETS);
  const readsAfterRegistration = offsetWidth.mock.calls.length;
  expect(readsAfterRegistration).toBe(1);

  for (let index = 0; index < 20; index += 1) {
    window.dispatchEvent(
      Object.assign(new Event("pointermove"), {
        clientX: 300 + index,
        clientY: 200 + index,
      }),
    );
    runScheduledFrame();
  }

  expect(element.style.position).toBe("fixed");
  expect(element.style.left).toBe(`${319 - OFFSETS.alignOffset - 120}px`);
  expect(element.style.top).toBe(`${219 + OFFSETS.sideOffset}px`);
  expect(offsetWidth.mock.calls.length).toBe(readsAfterRegistration);
  expect(offsetHeight).toHaveBeenCalledTimes(1);

  unregister();
  element.remove();
});
