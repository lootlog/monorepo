// @vitest-environment happy-dom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MOBILE_DAY_SWIPE_MEDIA_QUERY,
  useMobileDaySwipe,
} from "./use-mobile-day-swipe";

const createMediaQueryList = (query: string, matches: boolean) =>
  ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    matches,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }) satisfies MediaQueryList;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useMobileDaySwipe", () => {
  it("enables swiping for a coarse pointer without hover", () => {
    const matchMedia = vi.fn((query: string) =>
      createMediaQueryList(query, true),
    );
    vi.stubGlobal("matchMedia", matchMedia);

    const { result } = renderHook(() => useMobileDaySwipe());

    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(MOBILE_DAY_SWIPE_MEDIA_QUERY);
  });

  it("keeps swiping disabled for a narrow fine-pointer desktop", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => createMediaQueryList(query, false)),
    );

    const { result } = renderHook(() => useMobileDaySwipe());

    expect(result.current).toBe(false);
  });
});
