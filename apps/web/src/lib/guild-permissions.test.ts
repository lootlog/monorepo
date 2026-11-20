import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { describe, expect, it } from "vitest";
import { canManageGuild } from "./guild-permissions";

describe("canManageGuild", () => {
  it("returns true for admins", () => {
    expect(
      canManageGuild(createAccessPolicy({ capabilities: [Capability.ADMIN] })),
    ).toBe(true);
  });

  it("returns true for owners", () => {
    expect(
      canManageGuild(createAccessPolicy({ capabilities: [Capability.OWNER] })),
    ).toBe(true);
  });

  it("returns false without management permissions", () => {
    expect(
      canManageGuild(
        createAccessPolicy({
          capabilities: [Capability.LOOTLOG_LOOTS_READ],
        }),
      ),
    ).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canManageGuild(undefined)).toBe(false);
  });
});
