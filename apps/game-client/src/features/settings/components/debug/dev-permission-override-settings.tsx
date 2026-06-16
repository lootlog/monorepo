import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import {
  getDevPermissionOverride,
  setDevPermissionOverride,
} from "@/lib/dev-permission-override";
import { Permission, type DevPermissionOverride } from "@lootlog/types";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

const PERMISSIONS = Object.values(Permission);

export const DevPermissionOverrideSettings: FC = () => {
  const { t } = useTranslation();
  const [override, setOverride] = useState<DevPermissionOverride>(() => {
    return (
      getDevPermissionOverride() ?? {
        enabled: false,
        guildId: "",
        permissions: [],
        disableOwnerBypass: true,
        disableAdminBypass: true,
      }
    );
  });

  if (!import.meta.env.DEV) {
    return null;
  }

  const togglePermission = (permission: Permission) => {
    setOverride((current) => {
      const permissions = current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission];

      return {
        ...current,
        permissions,
      };
    });
  };

  const saveOverride = () => {
    setDevPermissionOverride({
      ...override,
      guildId: override.guildId?.trim() || undefined,
    });
  };

  const clearOverride = () => {
    const nextOverride = {
      enabled: false,
      guildId: "",
      permissions: [],
      disableOwnerBypass: true,
      disableAdminBypass: true,
    } satisfies DevPermissionOverride;

    setOverride(nextOverride);
    setDevPermissionOverride(undefined);
  };

  return (
    <SettingsSection
      title={t("settings.debug.devPermissionOverride.title")}
      description={t("settings.debug.devPermissionOverride.description")}
    >
      <SettingsPanel className="ll:flex ll:flex-col ll:gap-2">
        <label className="ll:flex ll:items-center ll:gap-2 ll:text-[11px] ll:text-gray-200">
          <input
            checked={override.enabled}
            type="checkbox"
            onChange={(event) =>
              setOverride((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          {t("settings.debug.devPermissionOverride.enabled")}
        </label>

        <label className="ll:flex ll:flex-col ll:gap-1 ll:text-[11px] ll:text-gray-300">
          <span>{t("settings.debug.devPermissionOverride.guildId")}</span>
          <input
            className="ll:h-6 ll:rounded-sm ll:border ll:border-gray-600 ll:bg-gray-950 ll:px-2 ll:text-[11px] ll:text-gray-100"
            value={override.guildId ?? ""}
            onChange={(event) =>
              setOverride((current) => ({
                ...current,
                guildId: event.target.value,
              }))
            }
          />
        </label>

        <div className="ll:grid ll:grid-cols-1 ll:gap-1 sm:ll:grid-cols-2">
          <label className="ll:flex ll:items-center ll:gap-2 ll:text-[11px] ll:text-gray-200">
            <input
              checked={override.disableOwnerBypass ?? true}
              type="checkbox"
              onChange={(event) =>
                setOverride((current) => ({
                  ...current,
                  disableOwnerBypass: event.target.checked,
                }))
              }
            />
            {t("settings.debug.devPermissionOverride.disableOwnerBypass")}
          </label>
          <label className="ll:flex ll:items-center ll:gap-2 ll:text-[11px] ll:text-gray-200">
            <input
              checked={override.disableAdminBypass ?? true}
              type="checkbox"
              onChange={(event) =>
                setOverride((current) => ({
                  ...current,
                  disableAdminBypass: event.target.checked,
                }))
              }
            />
            {t("settings.debug.devPermissionOverride.disableAdminBypass")}
          </label>
        </div>

        <details>
          <summary className="ll-custom-cursor-pointer ll:text-[11px] ll:font-medium ll:text-gray-200">
            {t("settings.debug.devPermissionOverride.permissions")}
          </summary>
          <div className="ll:mt-2 ll:grid ll:max-h-48 ll:grid-cols-1 ll:gap-1 ll:overflow-auto sm:ll:grid-cols-2">
            {PERMISSIONS.map((permission) => (
              <label
                className="ll:flex ll:items-center ll:gap-2 ll:text-[10px] ll:text-gray-300"
                key={permission}
              >
                <input
                  checked={override.permissions.includes(permission)}
                  type="checkbox"
                  onChange={() => togglePermission(permission)}
                />
                <span>
                  {t(
                    `settings.debug.devPermissionOverride.permission.${permission}`,
                  )}
                </span>
              </label>
            ))}
          </div>
        </details>

        <div className="ll:flex ll:justify-end ll:gap-1">
          <Button type="button" variant="ghost" onClick={clearOverride}>
            {t("settings.debug.devPermissionOverride.clear")}
          </Button>
          <Button type="button" onClick={saveOverride}>
            {t("settings.debug.devPermissionOverride.save")}
          </Button>
        </div>
      </SettingsPanel>
    </SettingsSection>
  );
};
