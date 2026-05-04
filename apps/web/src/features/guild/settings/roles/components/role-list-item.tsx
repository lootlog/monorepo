import { motion } from "framer-motion";
import type { FC } from "react";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";
import { Permission } from "@lootlog/types";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { useSelectorPanel } from "@/components/selector-panel";
import { SelectableListCard } from "@/components/selectable-list-card";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";

export type RoleListItemProps = {
  role: GuildRole;
  index: number;
};

export const RoleListItem: FC<RoleListItemProps> = ({ role, index }) => {
  const { selectedItem, handleSelect } = useSelectorPanel<GuildRole>();

  const isSelected = selectedItem?.id === role.id;
  const isPanelOpen = selectedItem !== null;

  const roleColor = role.color ?? 0;
  const color =
    roleColor === 0 ? "FFF" : roleColor.toString(16).padStart(6, "0");

  const hasAdminPermission = role.permissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) => role.permissions.includes(perm)),
      );

  const iconsContent = (
    <TooltipProvider delayDuration={100}>
      {activeCategories.map((category) => {
        const activePerms = category.permissions.filter((perm) =>
          role.permissions.includes(perm),
        );

        return (
          <PermissionCategoryTooltip
            key={category.name}
            category={category}
            activePermissions={activePerms}
            side="top"
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
    </TooltipProvider>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <SelectableListCard
        isSelected={isSelected}
        onClick={() => handleSelect(role)}
        icons={iconsContent}
        showIcons={!isPanelOpen}
      >
        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: `#${color}` }}
        />
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-sm truncate"
            style={{ color: `#${color}` }}
          >
            {role.name}
          </div>
          <div className="text-xs text-muted-foreground">
            Poziom {role.lvlRangeFrom} - {role.lvlRangeTo}
          </div>
        </div>
      </SelectableListCard>
    </motion.div>
  );
};
