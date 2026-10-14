import { MetaItem } from "@/components/common/meta-item";
import { ROUTES } from "@/config/routes";
import { SettingsDetailNotFound } from "../components/settings-detail-not-found";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { RolesForm } from "@/features/guild/settings/roles/components/roles-form";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { useParams } from "@tanstack/react-router";
import { Gauge, KeyRound, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsDetailPage } from "../components/settings-detail-page";
import { getActivePermissionCategories } from "./active-permission-categories";

export const RoleSettingsDetailPage = () => {
  const { t } = useTranslation();

  const { guildId, roleId } = useParams({
    from: "/_authenticated/$guildId/settings/roles_/$roleId",
  });

  const { data: roles } = useRolesControllerGetGuildRoles({ guildId });
  const role = roles?.find((item) => item.id === roleId) ?? null;

  if (roles && !role) {
    return (
      <SettingsDetailNotFound
        icon={ShieldX}
        title={t("settings.roles.roleNotFound")}
        description={t("settings.roles.roleNotFoundDescription")}
        backTo={ROUTES.guild.settings.roles(guildId)}
        backLabel={t("settings.roles.backToList")}
      />
    );
  }

  if (!role) {
    return null;
  }

  const color = getColorFromRoleColor(role.color);
  const activeCategories = getActivePermissionCategories(role.permissions);

  return (
    <SettingsDetailPage
      name={role.name}
      media={
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: `#${color}` }}
        />
      }
      nameStyle={{ color: `#${color}` }}
      meta={
        <>
          <MetaItem icon={Gauge} label={t("settings.roles.levelRangeTitle")}>
            {t("settings.roles.levelRange", {
              from: role.lvlRangeFrom,
              to: role.lvlRangeTo,
            })}
          </MetaItem>
          <MetaItem icon={KeyRound}>
            {role.permissions.length > 0
              ? t("settings.roles.permissionCountCompact", {
                  count: role.permissions.length,
                })
              : t("settings.roles.noPermissions")}
          </MetaItem>
          {activeCategories.length > 0 && (
            <span className="flex items-center gap-1">
              <TooltipProvider delay={100}>
                {activeCategories.map(({ category, activePermissions }) => (
                  <PermissionCategoryTooltip
                    key={category.groupKey}
                    category={category}
                    activePermissions={activePermissions}
                    side="bottom"
                  />
                ))}
              </TooltipProvider>
            </span>
          )}
        </>
      }
    >
      <RolesForm role={role} />
    </SettingsDetailPage>
  );
};
