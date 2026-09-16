import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NpcNotificationCooldown } from "./npc-notification-cooldown";

const animationCancel = vi.fn<() => void>();

type TestAnimation = { cancel: () => void };

const animate = vi.fn<
  (frames: Keyframe[], options: KeyframeAnimationOptions) => TestAnimation
>(() => ({ cancel: animationCancel }));

let originalAnimate: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  animate.mockClear();
  animationCancel.mockClear();
  originalAnimate = Object.getOwnPropertyDescriptor(
    SVGElement.prototype,
    "animate",
  );
  Object.defineProperty(SVGElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
});

afterEach(() => {
  vi.useRealTimers();

  if (originalAnimate) {
    Object.defineProperty(SVGElement.prototype, "animate", originalAnimate);
  } else {
    Reflect.deleteProperty(SVGElement.prototype, "animate");
  }
});

it("ticks the label on second boundaries and drains the ring with one animation", () => {
  const { unmount } = render(
    <NpcNotificationCooldown
      animationEffectsEnabled
      endsAt={Date.now() + 4300}
    />,
  );

  expect(screen.getByText("5")).toBeInTheDocument();
  expect(animate).toHaveBeenCalledTimes(1);
  expect(animate).toHaveBeenCalledWith(
    [
      { strokeDashoffset: expect.stringMatching(/^9\.67/) },
      { strokeDashoffset: expect.stringMatching(/^69\.11/) },
    ],
    { duration: 4300, easing: "steps(43, end)", fill: "forwards" },
  );
  expect(vi.getTimerCount()).toBe(1);

  act(() => vi.advanceTimersByTime(299));
  expect(screen.getByText("5")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("4")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("3")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("1")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("1")).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
  expect(animate).toHaveBeenCalledTimes(1);

  unmount();
  expect(animationCancel).toHaveBeenCalledTimes(1);
});

it("renders only the label when animation effects are off", () => {
  render(
    <NpcNotificationCooldown
      animationEffectsEnabled={false}
      endsAt={Date.now() + 2000}
    />,
  );

  expect(screen.getByText("2")).toBeInTheDocument();
  expect(animate).not.toHaveBeenCalled();
});
