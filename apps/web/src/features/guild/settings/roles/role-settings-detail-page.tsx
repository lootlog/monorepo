import { PageHeader } from "@/components/common/page-header";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { RolesForm } from "@/features/guild/settings/roles/components/roles-form";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { EmptyState } from "@/components/common/empty-state";
import { getActivePermissionCategories } from "./active-permission-categories";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { useParams } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export const RoleSettingsDetailPage = () => {
  const { t } = useTranslation();

  const { guildId, roleId } = useParams({
    from: "/_authenticated/$guildId/settings/roles_/$roleId",
  });

  const { data: roles } = useRolesControllerGetGuildRoles({ guildId });
  const role = roles?.find((item) => item.id === roleId) ?? null;

  if (roles && !role) {
    return (
      <EmptyState
        icon={ShieldX}
        title={t("settings.roles.roleNotFound")}
        description={t("settings.roles.roleNotFoundDescription")}
        className="h-full"
      />
    );
  }

  if (!role) {
    return null;
  }

  const color = getColorFromRoleColor(role.color);
  const activeCategories = getActivePermissionCategories(role.permissions);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar [scrollbar-gutter:stable]">
      <PageHeader
        media={
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `#${color}20` }}
          >
            <span
              className="size-3.5 rounded-full"
              style={{ backgroundColor: `#${color}` }}
            />
          </span>
        }
        title={<span style={{ color: `#${color}` }}>{role.name}</span>}
        description={
          <>
            {t("settings.roles.details")}
            {" · "}
            {t("settings.roles.levelRange", {
              from: role.lvlRangeFrom,
              to: role.lvlRangeTo,
            })}
          </>
        }
        metadata={
          activeCategories.length > 0 ? (
            <TooltipProvider delay={100}>
              {activeCategories.map(({ category, activePermissions }) => (
                <PermissionCategoryTooltip
                  key={category.name}
                  category={category}
                  activePermissions={activePermissions}
                  side="bottom"
                />
              ))}
            </TooltipProvider>
          ) : (
            t("settings.roles.noPermissions")
          )
        }
      />
      <ScrollArea className="min-h-48 flex-1">
        <div className="mx-auto w-full">
          <RolesForm role={role} />
        </div>
      </ScrollArea>
    </div>
  );
};
