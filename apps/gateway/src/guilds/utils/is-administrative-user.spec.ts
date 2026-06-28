import {
  isAdministrativeUser,
  isAdministrativeUserFromRoles,
} from "./is-administrative-user";
import { Permission } from "@lootlog/types";
import type { GuildRole } from "../types/guild.types";

const createRole = (permissions: Permission[]): GuildRole => ({
  id: "role-id",
  permissions,
  lvlRangeFrom: 1,
  lvlRangeTo: 999,
});

describe("isAdministrativeUser", () => {
  it("should return true for OWNER permission", () => {
    const permissions = [Permission.OWNER];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it("should return true for ADMIN permission", () => {
    const permissions = [Permission.ADMIN];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it("should return false for LOOTLOG_MANAGE permission", () => {
    const permissions = [Permission.LOOTLOG_MANAGE];

    expect(isAdministrativeUser(permissions)).toBe(false);
  });

  it("should return false for non-administrative permissions", () => {
    const permissions = [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_WRITE,
      Permission.LOOTLOG_CHAT_READ,
    ];

    expect(isAdministrativeUser(permissions)).toBe(false);
  });

  it("should return true when at least one administrative permission exists", () => {
    const permissions = [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.ADMIN,
      Permission.LOOTLOG_LOOTS_WRITE,
    ];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it("should return false for empty permissions array", () => {
    expect(isAdministrativeUser([])).toBe(false);
  });

  it("should return true when multiple administrative permissions exist", () => {
    const permissions = [
      Permission.OWNER,
      Permission.ADMIN,
      Permission.LOOTLOG_MANAGE,
    ];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });
});

describe("isAdministrativeUserFromRoles", () => {
  it("should return true when role has OWNER permission", () => {
    const roles = [createRole([Permission.OWNER])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it("should return true when role has ADMIN permission", () => {
    const roles = [createRole([Permission.ADMIN])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it("should return false when role has LOOTLOG_MANAGE permission", () => {
    const roles = [createRole([Permission.LOOTLOG_MANAGE])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(false);
  });

  it("should return false when no administrative permissions", () => {
    const roles = [
      createRole([
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(false);
  });

  it("should flatten permissions from multiple roles", () => {
    const roles = [
      createRole([Permission.LOOTLOG_LOOTS_READ]),
      createRole([Permission.ADMIN]),
      createRole([Permission.LOOTLOG_LOOTS_WRITE]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it("should return false for empty roles array", () => {
    expect(isAdministrativeUserFromRoles([])).toBe(false);
  });

  it("should handle roles with multiple permissions", () => {
    const roles = [
      createRole([
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_WRITE,
        Permission.ADMIN,
      ]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it("should handle roles with empty permissions", () => {
    const roles = [createRole([])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(false);
  });

  it("should treat LOOTLOG_MANAGE as non-administrative in gateway", () => {
    const rolesWithManage = [createRole([Permission.LOOTLOG_MANAGE])];
    const rolesWithAdmin = [createRole([Permission.ADMIN])];

    expect(isAdministrativeUserFromRoles(rolesWithManage)).toBe(false);
    expect(isAdministrativeUserFromRoles(rolesWithAdmin)).toBe(true);
  });
});
