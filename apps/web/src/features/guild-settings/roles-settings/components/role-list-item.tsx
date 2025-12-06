import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { FC } from "react";
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import { Permission } from "@lootlog/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { PERMISSION_CATEGORIES } from "@/features/guild-settings/roles-settings/constants/permission-categories";
import { useSelectorPanel } from "@/components/selector-panel";

export type RoleListItemProps = {
  role: GuildRole;
  index: number;
};

export const RoleListItem: FC<RoleListItemProps> = ({ role, index }) => {
  const { t } = useTranslation();
  const { selectedItem, handleSelect } = useSelectorPanel<GuildRole>();

  const isSelected = selectedItem?.id === role.id;
  const isPanelOpen = selectedItem !== null;

  const color =
    role.color === 0 ? "FFF" : role.color.toString(16).padStart(6, "0");

  const hasAdminPermission = role.permissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) => role.permissions.includes(perm)),
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
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-150",
          "bg-card/40 backdrop-blur-sm border-border",
          "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] py-1",
          isSelected &&
            "bg-primary/10 border-primary/50 shadow-lg scale-[1.01]",
        )}
        onClick={() => handleSelect(role)}
      >
        <div className="flex flex-wrap items-center gap-3 py-2 px-4 pl-5">
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
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground shrink-0 transition-all duration-150 hidden md:block",
              "absolute right-3 top-1/2 -translate-y-1/2",
              "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              isSelected && "opacity-100 translate-x-0 text-primary",
            )}
          />
          {!isPanelOpen && (
            <div className="flex items-center gap-1 w-full md:w-auto md:order-none order-last mt-2 md:mt-0 ml-5 md:ml-0 md:mr-6">
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
                          <IconComponent
                            className={cn("size-4", category.color)}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">
                            {category.name}
                          </p>
                          <ul className="text-xs space-y-0.5">
                            {activePerms.map((perm) => (
                              <li
                                key={perm}
                                className="flex items-start gap-1.5"
                              >
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
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
