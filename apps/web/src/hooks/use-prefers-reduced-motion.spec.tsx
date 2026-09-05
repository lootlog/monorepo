// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("usePrefersReducedMotion", () => {
  it("updates mounted consumers when the system preference changes and unsubscribes", () => {
    const events = new EventTarget();
    let matches = false;
    const query = {
      get matches() {
        return matches;
      },
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    } satisfies MediaQueryList;
    const remove = vi.spyOn(query, "removeEventListener");
    vi.stubGlobal("matchMedia", () => query);
    const first = renderHook(usePrefersReducedMotion);
    const second = renderHook(usePrefersReducedMotion);
    expect(first.result.current).toBe(false);
    act(() => {
      matches = true;
      events.dispatchEvent(new Event("change"));
    });
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    first.unmount();
    act(() => {
      matches = false;
      events.dispatchEvent(new Event("change"));
    });
    expect(second.result.current).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    second.unmount();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("falls back to normal motion when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(usePrefersReducedMotion);
    expect(result.current).toBe(false);
  });
});
