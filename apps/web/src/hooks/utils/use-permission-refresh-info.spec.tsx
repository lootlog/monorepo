// @vitest-environment happy-dom

import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePermissionRefreshInfo } from "./use-permission-refresh-info";

await initializeTestTranslations({
  "common.permissionRefresh.retryIn": "Spróbuj ponownie za {{time}}",
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-12T12:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

describe("usePermissionRefreshInfo", () => {
  it("does not offer a refresh without a known last update", () => {
    const { result } = renderHook(() => usePermissionRefreshInfo(undefined));

    expect(result.current.canTriggerRefresh).toBe(false);
  });

  it("allows a refresh once the cooldown has passed", () => {
    const { result } = renderHook(() =>
      usePermissionRefreshInfo(ago(REFRESH_PERMISSIONS_TTL + 1000)),
    );

    expect(result.current.canTriggerRefresh).toBe(true);
  });

  it("counts down the remaining cooldown and then allows a refresh", () => {
    const updatedAt = ago(REFRESH_PERMISSIONS_TTL - 2000);

    const { result } = renderHook(() => usePermissionRefreshInfo(updatedAt));

    expect(result.current.canTriggerRefresh).toBe(false);
    expect(result.current.canTriggerRefreshText).toContain("0:02");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.canTriggerRefreshText).toContain("0:01");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.canTriggerRefresh).toBe(true);
  });
});
