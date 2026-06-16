import type { Permission } from "./permissions.types.js";

export const DEV_PERMISSION_OVERRIDE_HEADER =
  "x-lootlog-dev-permission-override";

export const DEV_PERMISSION_OVERRIDE_STORAGE_KEY =
  "lootlog-dev-permission-override";

export const DEV_PERMISSION_OVERRIDE_EVENT =
  "lootlog-dev-permission-override-change";

export interface DevPermissionOverride {
  enabled: boolean;
  guildId?: string;
  permissions: Permission[];
  disableOwnerBypass?: boolean;
  disableAdminBypass?: boolean;
}
