import { z } from "zod";
import {
  DEV_PERMISSION_OVERRIDE_HEADER,
  type DevPermissionOverride,
} from "@lootlog/types";
import { env } from "src/config/env";
import { Permission } from "src/generated/prisma/client";
import { RuntimeEnvironment } from "src/types/runtime.types";

export { DEV_PERMISSION_OVERRIDE_HEADER };

export type ApiDevPermissionOverride = Omit<
  DevPermissionOverride,
  "permissions"
> & {
  permissions: Permission[];
};

const DevPermissionOverrideSchema = z.object({
  enabled: z.boolean(),
  guildId: z.string().trim().min(1).optional(),
  permissions: z.array(z.nativeEnum(Permission)).default([]),
  disableOwnerBypass: z.boolean().optional(),
  disableAdminBypass: z.boolean().optional(),
});

export const isDevPermissionOverrideEnabled = () => {
  if (env.ENV === RuntimeEnvironment.PROD) {
    return false;
  }

  return (
    env.DEV_PERMISSION_OVERRIDE_ENABLED ||
    env.ENV === RuntimeEnvironment.LOCAL ||
    env.ENV === RuntimeEnvironment.DEV
  );
};

export const parseDevPermissionOverrideHeader = (
  header: string | string[] | undefined,
): ApiDevPermissionOverride | undefined => {
  if (!isDevPermissionOverrideEnabled()) {
    return undefined;
  }

  const rawValue = Array.isArray(header) ? header[0] : header;

  if (!rawValue) {
    return undefined;
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(decodeDevPermissionOverride(rawValue));
  } catch {
    return undefined;
  }

  const parsed = DevPermissionOverrideSchema.safeParse(decoded);

  if (!parsed.success || !parsed.data.enabled) {
    return undefined;
  }

  return normalizeDevPermissionOverride(parsed.data);
};

export const getDevPermissionOverrideForGuild = (
  override: ApiDevPermissionOverride | undefined,
  guildId: string,
) => {
  if (!override?.enabled) {
    return undefined;
  }

  if (override.guildId && override.guildId !== guildId) {
    return undefined;
  }

  return override;
};

export const normalizeDevPermissionOverride = (
  override: ApiDevPermissionOverride,
): ApiDevPermissionOverride => {
  if (
    !override.disableAdminBypass &&
    override.permissions.some(
      (permission) =>
        permission === Permission.OWNER || permission === Permission.ADMIN,
    )
  ) {
    return {
      ...override,
      permissions: Object.values(Permission),
    };
  }

  const permissions = Array.from(new Set(override.permissions)).filter(
    (permission) => {
      if (!override.disableAdminBypass) {
        return true;
      }

      return permission !== Permission.OWNER && permission !== Permission.ADMIN;
    },
  );

  return {
    ...override,
    permissions,
  };
};

export const createDevPermissionOverrideRole = (
  override: ApiDevPermissionOverride,
  guildId: string,
) => ({
  id: "dev-permission-override",
  name: "Dev Permission Override",
  guildId,
  color: 0,
  position: 0,
  lvlRangeFrom: 0,
  lvlRangeTo: 999,
  permissions: override.permissions,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const decodeDevPermissionOverride = (value: string) => {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return value;
  }
};
