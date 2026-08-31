import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { PermissionResolver } from "./permission-resolver.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

describe("PermissionResolver", () => {
  it("expands ADMIN capabilities without granting the OWNER recovery marker", () => {
    expect(PermissionResolver.resolve([Permission.ADMIN])).toEqual(
      Object.values(Permission).filter(
        (permission) => permission !== Permission.OWNER,
      ),
    );
  });

  it("returns all permissions for OWNER", () => {
    expect(PermissionResolver.resolve([Permission.OWNER])).toEqual(
      Object.values(Permission),
    );
  });

  it("does not expand LOOTLOG_MANAGE into LOOTLOG_ACCESS", () => {
    expect(PermissionResolver.resolve([Permission.LOOTLOG_MANAGE])).toEqual([
      Permission.LOOTLOG_MANAGE,
    ]);
  });

  it("requires explicit LOOTLOG_ACCESS for application access", () => {
    expect(PermissionResolver.hasAccess([Permission.LOOTLOG_ACCESS])).toBe(
      true,
    );
    expect(PermissionResolver.hasAccess([Permission.LOOTLOG_MANAGE])).toBe(
      false,
    );
    expect(PermissionResolver.hasAccess([Permission.ADMIN])).toBe(true);
  });

  it("treats LOOTLOG_MANAGE as manager access without making it administrative", () => {
    expect(
      PermissionResolver.isAdministrativeOrManager([Permission.LOOTLOG_MANAGE]),
    ).toBe(true);
    expect(
      PermissionResolver.isAdministrative([Permission.LOOTLOG_MANAGE]),
    ).toBe(false);
  });
});
