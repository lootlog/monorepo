import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@/utils/cn";
import type { Permission } from "@lootlog/types";
import type { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";
import type { PermissionCategory } from "../roles/constants/permission-categories";

type PermissionCategoryTooltipProps = {
  category: PermissionCategory;
  activePermissions: Permission[];
  side: "top" | "bottom";
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export const PermissionCategoryTooltip = ({
  category,
  activePermissions,
  side,
  onClick,
}: PermissionCategoryTooltipProps) => {
  const { t } = useTranslation();
  const IconComponent = category.icon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "p-1.5 rounded-md transition-colors",
              category.bgColor,
            )}
            onClick={onClick}
          >
            <IconComponent className={cn("size-4", category.color)} />
          </div>
        }
      />
      <TooltipContent side={side} className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold text-sm">{category.name}</p>
          <ul className="text-xs space-y-0.5">
            {activePermissions.map((permission) => (
              <li key={permission} className="flex items-start gap-1.5">
                <span className="text-muted-foreground">•</span>
                <span>{t(`permissions.${permission}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
