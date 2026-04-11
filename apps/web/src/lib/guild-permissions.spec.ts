import { Permission } from "@lootlog/types";
import { describe, expect, it } from "vitest";
import { canManageGuild } from "./guild-permissions";

describe("canManageGuild", () => {
  it("returns true for admins", () => {
    expect(canManageGuild([Permission.ADMIN])).toBe(true);
  });

  it("returns true for owners", () => {
    expect(canManageGuild([Permission.OWNER])).toBe(true);
  });

  it("returns false without management permissions", () => {
    expect(canManageGuild([Permission.LOOTLOG_LOOTS_READ])).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canManageGuild(undefined)).toBe(false);
  });
});
