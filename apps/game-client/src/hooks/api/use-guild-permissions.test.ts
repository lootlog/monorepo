import { describe, expect, it } from "vitest";
import { Permission } from "@lootlog/types";
import {
  getGuildPermissionsQueryKey,
  normalizeGuildPermissions,
} from "./use-guild-permissions";

describe("use-guild-permissions helpers", () => {
  it("uses a versioned query key for guild permissions cache entries", () => {
    expect(getGuildPermissionsQueryKey("guild-1")).toEqual([
      "guild-permissions-v2",
      "guild-1",
    ]);
  });

  it("returns permissions unchanged when the response shape is valid", () => {
    expect(
      normalizeGuildPermissions([
        Permission.LOOTLOG_MANAGE,
        Permission.LOOTLOG_TIMERS_DELETE,
      ]),
    ).toEqual([Permission.LOOTLOG_MANAGE, Permission.LOOTLOG_TIMERS_DELETE]);
  });

  it("drops legacy cached non-array shapes instead of throwing", () => {
    expect(
      normalizeGuildPermissions({
        data: [Permission.LOOTLOG_MANAGE, Permission.LOOTLOG_TIMERS_DELETE],
      }),
    ).toEqual([]);
  });

  it("filters out invalid array entries", () => {
    expect(
      normalizeGuildPermissions([
        Permission.LOOTLOG_MANAGE,
        42,
        null,
        undefined,
      ]),
    ).toEqual([Permission.LOOTLOG_MANAGE]);
  });
});
