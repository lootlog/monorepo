import {
  DEV_PERMISSION_OVERRIDE_EVENT,
  DEV_PERMISSION_OVERRIDE_HEADER,
  DEV_PERMISSION_OVERRIDE_STORAGE_KEY,
  Permission,
  type DevPermissionOverride,
} from "@lootlog/types";

export { DEV_PERMISSION_OVERRIDE_EVENT, DEV_PERMISSION_OVERRIDE_HEADER };

const isDevPermissionOverrideAvailable = () => {
  return import.meta.env.DEV && typeof window !== "undefined";
};

export const getDevPermissionOverride = () => {
  if (!isDevPermissionOverrideAvailable()) {
    return undefined;
  }

  const value = window.localStorage.getItem(
    DEV_PERMISSION_OVERRIDE_STORAGE_KEY,
  );

  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<DevPermissionOverride>;

    if (!parsed.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      guildId: parsed.guildId,
      permissions: (parsed.permissions ?? []).filter((permission) =>
        Object.values(Permission).includes(permission),
      ),
      disableOwnerBypass: parsed.disableOwnerBypass ?? true,
      disableAdminBypass: parsed.disableAdminBypass ?? true,
    } satisfies DevPermissionOverride;
  } catch {
    return undefined;
  }
};

export const setDevPermissionOverride = (
  override: DevPermissionOverride | undefined,
) => {
  if (!isDevPermissionOverrideAvailable()) {
    return;
  }

  if (override?.enabled) {
    window.localStorage.setItem(
      DEV_PERMISSION_OVERRIDE_STORAGE_KEY,
      JSON.stringify(override),
    );
  } else {
    window.localStorage.removeItem(DEV_PERMISSION_OVERRIDE_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(DEV_PERMISSION_OVERRIDE_EVENT));
};

export const getSerializedDevPermissionOverride = () => {
  const override = getDevPermissionOverride();

  if (!override) {
    return undefined;
  }

  return window
    .btoa(JSON.stringify(override))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const applyDevPermissionOverrideHeader = (headers: Headers) => {
  const serialized = getSerializedDevPermissionOverride();

  if (serialized) {
    headers.set(DEV_PERMISSION_OVERRIDE_HEADER, serialized);
  }
};
