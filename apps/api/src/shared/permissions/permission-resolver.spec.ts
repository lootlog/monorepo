import { Permission } from "src/db/domain";
import { PermissionResolver } from "./permission-resolver";

describe("PermissionResolver", () => {
  it("returns all permissions for administrative users", () => {
    expect(PermissionResolver.resolve([Permission.ADMIN])).toEqual(
      Object.values(Permission),
    );
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
