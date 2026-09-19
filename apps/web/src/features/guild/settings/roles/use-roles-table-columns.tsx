import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { getColorFromRoleColor } from "@/utils/get-color-from-role";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { TextLink } from "@lootlog/ui/components/text-link";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "cn";
import { CheckCircle2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getActivePermissionCategories } from "./active-permission-categories";

type ColumnsProps = {
  guildId: string;
  openRoleDetails: (role: GuildRole) => void;
};

export function useRolesTableColumns({
  guildId,
  openRoleDetails,
}: ColumnsProps) {
  const { t } = useTranslation();

  const columns: ColumnDef<typeof coreTableFeatures, GuildRole>[] = [
    {
      id: "role",
      header: () => t("settings.roles.table.role"),
      cell: ({ row: { original: role } }) => (
        <TextLink
          className="flex min-w-0 items-center gap-3 text-sm"
          render=<Link
            to="/$guildId/settings/roles/$roleId"
            params={{ guildId, roleId: role.id }}
          />
        >
          <span
            className="size-3 shrink-0 rounded-full"
            style={{
              backgroundColor: `#${getColorFromRoleColor(role.color)}`,
            }}
          />
          <span className="truncate text-sm font-semibold">{role.name}</span>
        </TextLink>
      ),
    },
    {
      id: "levelRange",
      header: () => t("settings.roles.table.levelRange"),
      cell: ({ row: { original: role } }) => (
        <TextLink
          className="block truncate text-sm"
          render=<Link
            to="/$guildId/settings/roles/$roleId"
            params={{ guildId, roleId: role.id }}
          />
        >
          {t("settings.roles.levelRange", {
            from: role.lvlRangeFrom,
            to: role.lvlRangeTo,
          })}
        </TextLink>
      ),
    },
    {
      id: "permissions",
      header: () => t("settings.roles.table.permissions"),
      cell: ({ row: { original: role } }) => {
        const activeCategories = getActivePermissionCategories(
          role.permissions,
        );

        return (
          <Link
            to="/$guildId/settings/roles/$roleId"
            params={{ guildId, roleId: role.id }}
            className="flex min-h-7 min-w-0 items-center gap-1"
          >
            {activeCategories.length > 0 ? (
              <TooltipProvider delay={100}>
                {activeCategories.map(({ category, activePermissions }) => {
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
        );
      },
    },
    {
      id: "actions",
      header: () => t("settings.roles.table.actions"),
      cell: ({ row: { original: role } }) => (
        <div data-settings-row-action>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 md:size-8"
                  aria-label={t("settings.roles.actions.more")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openRoleDetails(role)}>
                <CheckCircle2 className="size-4" />
                {t("settings.roles.actions.viewDetails")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return columns;
}
