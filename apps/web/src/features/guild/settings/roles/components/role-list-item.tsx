import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";
import type { FC } from "react";
import type { RoleResponseDtoOutput as GuildRole } from "@/lib/api/generated/main/model";
import { Permission } from "@lootlog/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { useSelectorPanel } from "@/components/selector-panel";
import { SelectableListCard } from "@/components/selectable-list-card";

export type RoleListItemProps = {
  role: GuildRole;
  index: number;
};

export const RoleListItem: FC<RoleListItemProps> = ({ role, index }) => {
  const { t } = useTranslation();
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
        const IconComponent = category.icon;
        const activePerms = category.permissions.filter((perm) =>
          role.permissions.includes(perm),
        );

        return (
          <Tooltip key={category.name}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  category.bgColor,
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <IconComponent className={cn("size-4", category.color)} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-sm">{category.name}</p>
                <ul className="text-xs space-y-0.5">
                  {activePerms.map((perm) => (
                    <li key={perm} className="flex items-start gap-1.5">
                      <span className="text-muted-foreground">•</span>
                      <span>{t(`permissions.${perm}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
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
