import { Permission, type DevPermissionOverride } from "@lootlog/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getDevPermissionOverride,
  setDevPermissionOverride,
} from "@/lib/dev-permission-override";

const PERMISSIONS = Object.values(Permission);

type Props = {
  guildId?: string;
};

export const DevPermissionOverridePanel = ({ guildId }: Props) => {
  const { t } = useTranslation();
  const [override, setOverride] = useState<DevPermissionOverride>(() => {
    return (
      getDevPermissionOverride() ?? {
        enabled: false,
        guildId: guildId ?? "",
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-full rounded-md border border-border/70 bg-background/80 px-2 py-1.5 text-left text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          type="button"
        >
          {t("common.devPermissionOverride.trigger")}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 p-3 text-xs"
        side="right"
        sideOffset={8}
      >
        <div className="flex items-center justify-between gap-3">
          <strong className="text-xs font-semibold">
            {t("common.devPermissionOverride.title")}
          </strong>
          <label className="flex items-center gap-2">
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
            {t("common.devPermissionOverride.enabled")}
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block font-medium">
            {t("common.devPermissionOverride.guildId")}
          </span>
          <input
            className="h-7 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={override.guildId ?? ""}
            onChange={(event) =>
              setOverride((current) => ({
                ...current,
                guildId: event.target.value,
              }))
            }
          />
        </label>

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2">
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
            {t("common.devPermissionOverride.disableOwnerBypass")}
          </label>
          <label className="flex items-center gap-2">
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
            {t("common.devPermissionOverride.disableAdminBypass")}
          </label>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer font-medium">
            {t("common.devPermissionOverride.permissions")}
          </summary>
          <div className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
            {PERMISSIONS.map((permission) => (
              <label className="flex items-center gap-2" key={permission}>
                <input
                  checked={override.permissions.includes(permission)}
                  type="checkbox"
                  onChange={() => togglePermission(permission)}
                />
                <span>{t(`permissions.${permission}`)}</span>
              </label>
            ))}
          </div>
        </details>

        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-md border border-border px-2 py-1"
            type="button"
            onClick={clearOverride}
          >
            {t("common.devPermissionOverride.clear")}
          </button>
          <button
            className="rounded-md bg-primary px-2 py-1 text-primary-foreground"
            type="button"
            onClick={saveOverride}
          >
            {t("common.devPermissionOverride.save")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
