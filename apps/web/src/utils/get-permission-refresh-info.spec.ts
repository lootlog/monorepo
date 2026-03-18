import { describe, expect, it } from "vitest";
import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";

describe("getPermissionRefreshInfo", () => {
  it("returns default status when updatedAt is missing", () => {
    expect(getPermissionRefreshInfo(undefined, Date.now())).toEqual({
      canTriggerRefresh: false,
      canTriggerRefreshText: "Uprawnienia są aktualne",
    });
  });

  it("allows refresh after the ttl window expires", () => {
    const currentTimestamp = new Date("2026-03-12T12:00:00.000Z").getTime();
    const updatedAt = new Date(
      currentTimestamp - REFRESH_PERMISSIONS_TTL - 1000,
    ).toISOString();

    expect(getPermissionRefreshInfo(updatedAt, currentTimestamp)).toEqual({
      canTriggerRefresh: true,
      canTriggerRefreshText: "Odśwież swoje uprawnienia",
    });
  });

  it("returns remaining minutes when refresh is still rate-limited", () => {
    const currentTimestamp = new Date("2026-03-12T12:00:00.000Z").getTime();
    const updatedAt = new Date(currentTimestamp - 2 * 60 * 1000).toISOString();

    expect(getPermissionRefreshInfo(updatedAt, currentTimestamp)).toEqual({
      canTriggerRefresh: false,
      canTriggerRefreshText: "Spróbuj ponownie za 3 min",
    });
  });
});
