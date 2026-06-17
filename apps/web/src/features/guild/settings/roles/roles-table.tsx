import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import { cn } from "@/utils/cn";
import { Permission } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type RolesTableProps = {
  guildId: string;
  isMobile: boolean;
  roles: GuildRole[];
};

const getActivePermissionCategories = (role: GuildRole) => {
  const hasAdminPermission = role.permissions.includes(Permission.ADMIN);

  if (hasAdminPermission) {
    return PERMISSION_CATEGORIES.filter((category) =>
      category.permissions.includes(Permission.ADMIN),
    );
  }

  return PERMISSION_CATEGORIES.filter((category) =>
    category.permissions.some((permission) =>
      role.permissions.includes(permission),
    ),
  );
};

export const RolesTable = ({ guildId, isMobile, roles }: RolesTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openRoleDetails = (role: GuildRole) => {
    navigate({
      to: "/$guildId/settings/roles/$roleId",
      params: { guildId, roleId: role.id },
    });
  };

  if (isMobile) {
    return (
      <div className="divide-y divide-border">
        {roles.map((role) => {
          const color = getColorFromRoleColor(role.color);

          return (
            <button
              key={role.id}
              type="button"
              className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => openRoleDetails(role)}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: `#${color}` }}
              />
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-semibold"
                  style={{ color: `#${color}` }}
                >
                  {role.name}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {t("settings.roles.levelRange", {
                    from: role.lvlRangeFrom,
                    to: role.lvlRangeTo,
                  })}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {t("settings.roles.permissionCountCompact", {
                  count: role.permissions.length,
                })}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Table className="min-w-[820px] table-fixed">
      <colgroup>
        <col className="w-[300px]" />
        <col className="w-[180px]" />
        <col />
        <col className="w-16" />
      </colgroup>
      <TableHeader
        className="sticky top-0 z-10 bg-sidebar/95 backdrop-blur-sm [&_tr]:!border-b-0"
        style={{ boxShadow: "inset 0 -1px 0 var(--border)" }}
      >
        <TableRow className="h-10 border-b-0 hover:bg-transparent">
          <TableHead>{t("settings.roles.table.role")}</TableHead>
          <TableHead>{t("settings.roles.table.levelRange")}</TableHead>
          <TableHead>{t("settings.roles.table.permissions")}</TableHead>
          <TableHead className="text-right">
            {t("settings.roles.table.actions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role, index) => {
          const color = getColorFromRoleColor(role.color);
          const roleRouteParams = { guildId, roleId: role.id };
          const activeCategories = getActivePermissionCategories(role);
          const isLastRole = index === roles.length - 1;

          return (
            <TableRow
              key={role.id}
              role="link"
              tabIndex={0}
              className={cn(
                "relative h-16 cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/35",
                isLastRole && "border-b-0",
              )}
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button,a,[data-role-row-action]")) {
                  return;
                }

                openRoleDetails(role);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }

                event.preventDefault();
                openRoleDetails(role);
              }}
            >
              <TableCell className="min-w-0 overflow-hidden">
                <Link
                  to="/$guildId/settings/roles/$roleId"
                  params={roleRouteParams}
                  className="flex min-w-0 items-center gap-3"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: `#${color}` }}
                  />
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ color: `#${color}` }}
                  >
                    {role.name}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden text-xs text-muted-foreground">
                <Link
                  to="/$guildId/settings/roles/$roleId"
                  params={roleRouteParams}
                  className="block truncate"
                >
                  {t("settings.roles.levelRange", {
                    from: role.lvlRangeFrom,
                    to: role.lvlRangeTo,
                  })}
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden">
                <Link
                  to="/$guildId/settings/roles/$roleId"
                  params={roleRouteParams}
                  className="flex min-h-7 min-w-0 items-center gap-1"
                >
                  {activeCategories.length > 0 ? (
                    <TooltipProvider delayDuration={100}>
                      {activeCategories.map((category) => {
                        const activePermissions = category.permissions.filter(
                          (permission) => role.permissions.includes(permission),
                        );

                        return (
                          <PermissionCategoryTooltip
                            key={category.name}
                            category={category}
                            activePermissions={activePermissions}
                            side="top"
                            onClick={(event) => event.stopPropagation()}
                          />
                        );
                      })}
                    </TooltipProvider>
                  ) : (
                    <span className="truncate text-xs text-muted-foreground">
                      {t("settings.roles.noPermissions")}
                    </span>
                  )}
                  <span
                    className={cn(
                      "ml-1 truncate text-xs text-muted-foreground",
                      activeCategories.length === 0 && "ml-0",
                    )}
                  >
                    {t("settings.roles.permissionCountCompact", {
                      count: role.permissions.length,
                    })}
                  </span>
                </Link>
              </TableCell>
              <TableCell
                data-role-row-action
                className="text-right"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("settings.roles.actions.more")}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => openRoleDetails(role)}>
                      <CheckCircle2 className="size-4" />
                      {t("settings.roles.actions.viewDetails")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
