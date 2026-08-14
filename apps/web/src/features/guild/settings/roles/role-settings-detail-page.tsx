import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { RolesForm } from "@/features/guild/settings/roles/components/roles-form";
import { useRolesControllerGetGuildRoles } from "@lootlog/api-client/react-query/main/roles";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import { Permission } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

export const RoleSettingsDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { guildId, roleId } = useParams({
    from: "/_authenticated/$guildId/settings/roles_/$roleId",
  });
  const { data: roles } = useRolesControllerGetGuildRoles({ guildId });
  const role = roles?.find((item) => item.id === roleId) ?? null;
  const handleBack = () => {
    navigate({
      to: "/$guildId/settings/roles",
      params: { guildId },
    });
  };

  if (roles && !role) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="shrink-0 border-b border-border bg-background px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            {t("settings.roles.backToRoles")}
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-sm text-muted-foreground">
            <ShieldX className="mx-auto mb-3 size-10 opacity-50" />
            <p className="text-sm font-medium text-foreground">
              {t("settings.roles.roleNotFound")}
            </p>
            <p className="mt-1 text-xs">
              {t("settings.roles.roleNotFoundDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return null;
  }

  const color = getColorFromRoleColor(role.color);
  const hasAdminPermission = role.permissions.includes(Permission.ADMIN);
  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((permission) =>
          role.permissions.includes(permission),
        ),
      );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label={t("settings.roles.backToRoles")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `#${color}20` }}
            >
              <span
                className="size-4 rounded-full"
                style={{ backgroundColor: `#${color}` }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {t("settings.roles.details")}
              </p>
              <h2
                className="truncate text-base font-semibold leading-tight"
                style={{ color: `#${color}` }}
              >
                {role.name}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {t("settings.roles.levelRange", {
                  from: role.lvlRangeFrom,
                  to: role.lvlRangeTo,
                })}
              </p>
            </div>
          </div>
          <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-1 pl-12 sm:pl-0">
            {activeCategories.length > 0 ? (
              <TooltipProvider delay={100}>
                {activeCategories.map((category) => {
                  const activePermissions = category.permissions.filter(
                    (permission) => role.permissions.includes(permission),
                  );

                  return (
                    <PermissionCategoryTooltip
                      key={category.name}
                      category={category}
                      activePermissions={activePermissions}
                      side="bottom"
                    />
                  );
                })}
              </TooltipProvider>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("settings.roles.noPermissions")}
              </span>
            )}
          </div>
        </div>
      </Card>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full">
          <RolesForm role={role} />
        </div>
      </ScrollArea>
    </div>
  );
};
