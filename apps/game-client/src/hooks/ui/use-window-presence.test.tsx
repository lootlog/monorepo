import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowPresence } from "./use-window-presence";

describe("useWindowPresence", () => {
  afterEach(() => {
    vi.useRealTimers();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("retains a closing window until its exit animation ends", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const { result, rerender } = renderHook(
      ({ isOpen }) => useWindowPresence(isOpen),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.shouldRender).toBe(true);
    expect(result.current.phase).toBe("exit");

    act(() => result.current.onAnimationEnd());

    expect(result.current.shouldRender).toBe(false);
  });

  it("releases the entry animation after it ends", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const { result } = renderHook(() => useWindowPresence(true));

    expect(result.current.phase).toBe("enter");

    act(() => result.current.onAnimationEnd());

    expect(result.current.phase).toBe("open");
    expect(result.current.shouldRender).toBe(true);
  });

  it("releases the entry animation through a fallback timeout", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const { result } = renderHook(() => useWindowPresence(true));

    act(() => vi.advanceTimersByTime(240));

    expect(result.current.phase).toBe("open");
  });

  it("unmounts immediately when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });
    const { result, rerender } = renderHook(
      ({ isOpen }) => useWindowPresence(isOpen),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.phase).toBe("open");
    expect(result.current.shouldRender).toBe(false);
  });

  it("uses a timeout when the browser does not emit animationend", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const { result, rerender } = renderHook(
      ({ isOpen }) => useWindowPresence(isOpen),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });
    act(() => vi.advanceTimersByTime(180));

    expect(result.current.shouldRender).toBe(false);
  });

  it("cancels exit retention when the window reopens", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const { result, rerender } = renderHook(
      ({ isOpen }) => useWindowPresence(isOpen),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });
    rerender({ isOpen: true });
    act(() => vi.advanceTimersByTime(180));

    expect(result.current.phase).toBe("enter");
    expect(result.current.shouldRender).toBe(true);
  });
});
