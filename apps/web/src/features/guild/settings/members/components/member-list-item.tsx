import { cn } from "@lootlog/ui/lib/utils";
import { Crown } from "lucide-react";
import { type FC, useMemo } from "react";
import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { useSelectorPanel } from "@/components/selector-panel";
import { SelectableListCard } from "@/components/selectable-list-card";
import { Permission } from "@lootlog/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { MemberDiscordSyncIndicator } from "@/features/guild/settings/members/components/member-discord-sync-indicator";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";

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

  const memberPermissions = useMemo(() => {
    const perms = new Set<Permission>();
    for (const role of member.roles) {
      for (const perm of role.permissions) {
        perms.add(perm as Permission);
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
      <MemberDiscordSyncIndicator member={member} />
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
              <p className="font-semibold text-sm">
                {t("settings.members.owner")}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider delayDuration={100}>
        {activeCategories.map((category) => {
          const activePerms = category.permissions.filter((perm) =>
            memberPermissions.includes(perm),
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
    </>
  );

  return (
    <SelectableListCard
      isSelected={isSelected}
      onClick={() => handleSelect(member)}
      icons={iconsContent}
      showIcons={!isPanelOpen}
      className={cn(!member.active && "opacity-50")}
    >
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
          {member.lastDiscordSyncAt
            ? t("settings.members.discordSync.lastConfirmedRelative", {
                time: getRelativeTime(member.lastDiscordSyncAt),
              })
            : t("settings.members.discordSync.notConfirmed")}
        </div>
      </div>
    </SelectableListCard>
  );
};
