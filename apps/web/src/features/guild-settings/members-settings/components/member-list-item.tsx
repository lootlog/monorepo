import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { ChevronRight, Crown } from "lucide-react";
import { type FC, useMemo } from "react";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { useSelectorPanel } from "@/components/selector-panel";
import { Permission } from "@lootlog/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { PERMISSION_CATEGORIES } from "@/features/guild-settings/roles-settings/constants/permission-categories";

export type MemberListItemProps = {
  member: GuildMember;
  isOwner?: boolean;
};

export const MemberListItem: FC<MemberListItemProps> = ({
  member,
  isOwner = false,
}) => {
  const { t } = useTranslation();
  const { selectedItem, handleSelect } = useSelectorPanel<GuildMember>();

  const isSelected = selectedItem?.id === member.id;
  const isPanelOpen = selectedItem !== null;
  const color = getColorFromRole(member.roles);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar);

  // Collect all permissions from all roles
  const memberPermissions = useMemo(() => {
    const perms = new Set<Permission>();
    for (const role of member.roles) {
      for (const perm of role.permissions) {
        perms.add(perm);
      }
    }
    return Array.from(perms);
  }, [member.roles]);

  const hasAdminPermission = memberPermissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) => memberPermissions.includes(perm)),
      );

  const iconsContent = (
    <>
      {isOwner && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="p-1.5 rounded-md transition-colors bg-amber-500/10"
                onClick={(e) => e.stopPropagation()}
              >
                <Crown className="size-4 text-amber-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-sm">Właściciel serwera</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider delayDuration={100}>
        {activeCategories.map((category) => {
          const IconComponent = category.icon;
          const activePerms = category.permissions.filter((perm) =>
            memberPermissions.includes(perm),
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
    </>
  );

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-150",
        "bg-card/40 backdrop-blur-sm border-border",
        "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] py-1",
        isSelected && "bg-primary/10 border-primary/50 shadow-lg scale-[1.01]",
        !member.active && "opacity-50",
      )}
      onClick={() => handleSelect(member)}
    >
      <div className="flex flex-wrap items-center gap-3 py-2 px-4 pl-5">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={avatarUrl} />
        </Avatar>
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-sm truncate"
            style={{ color: `#${color}` }}
          >
            {member.name}
          </div>
          <div className="text-xs text-muted-foreground">
            Odświeżono {getRelativeTime(member.updatedAt)}
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
        {/* Show icons on right side when panel is closed */}
        {!isPanelOpen && (
          <div className="flex items-center gap-1 w-full md:w-auto md:order-none order-last mt-2 md:mt-0 ml-11 md:ml-0 md:mr-6">
            {iconsContent}
          </div>
        )}
      </div>
    </Card>
  );
};
