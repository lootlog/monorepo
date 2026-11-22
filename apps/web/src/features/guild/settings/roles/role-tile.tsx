import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { discordRoleColorHex } from "@lootlog/domain/member-display-role";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Gauge, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getActivePermissionCategories } from "./active-permission-categories";
import { RoleColorMark } from "./role-color-mark";

type RoleTileProps = {
  guildId: string;
  role: GuildRole;
};

export const RoleTile = ({ guildId, role }: RoleTileProps) => {
  const { t } = useTranslation();
  const color = discordRoleColorHex(role.color) ?? "FFFFFF";
  const activeCategories = getActivePermissionCategories(role.permissions);

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <Link
        to="/$guildId/settings/roles/$roleId"
        params={{ guildId, roleId: role.id }}
        className={cn(getListTileLinkClassName(false), LIST_TILE_HOVER_CLASS)}
      >
        <RoleColorMark color={color} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className="truncate text-sm font-semibold"
            style={{ color: `#${color}` }}
          >
            {role.name}
          </span>
          <span className="flex min-w-0 items-center gap-x-3">
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
          </span>
        </span>
        {activeCategories.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 max-sm:hidden">
            <TooltipProvider delay={100}>
              {activeCategories.map(({ category, activePermissions }) => (
                <PermissionCategoryTooltip
                  key={category.groupKey}
                  category={category}
                  activePermissions={activePermissions}
                  side="top"
                />
              ))}
            </TooltipProvider>
          </span>
        )}
      </Link>
    </div>
  );
};
