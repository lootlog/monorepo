import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { MemberData } from "@/features/guild-settings/members-settings/components/member-data";
import { MemberSyncButton } from "@/features/guild-settings/members-settings/components/member-sync-button";
import { ArrowLeft, Crown } from "lucide-react";
import { useMemo, type FC } from "react";
import { useSelectorPanel } from "@/components/selector-panel";
import { Permission } from "@lootlog/types";
import { PERMISSION_CATEGORIES } from "@/features/guild-settings/roles-settings/constants/permission-categories";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";

export type MembersPanelContentProps = {
  selectedMemberColor: string | undefined;
  isOwner?: boolean;
};

export const MembersPanelContent: FC<MembersPanelContentProps> = ({
  selectedMemberColor,
  isOwner = false,
}) => {
  const { t } = useTranslation();
  const {
    selectedItem: selectedMember,
    setSelectedItem: setSelectedMember,
    isMobileDrawerOpen,
  } = useSelectorPanel<GuildMember>();
  const memberPermissions = useMemo(() => {
    if (!selectedMember) return [];
    const perms = new Set<Permission>();
    for (const role of selectedMember.roles) {
      for (const perm of role.permissions) {
        perms.add(perm);
      }
    }
    return Array.from(perms);
  }, [selectedMember]);

  const hasAdminPermission = memberPermissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) => memberPermissions.includes(perm)),
      );

  if (!selectedMember) return null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {!isMobileDrawerOpen && (
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-2">
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors mr-3"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="size-8 shrink-0">
              <AvatarImage
                src={getDiscordAvatarUrl(
                  selectedMember.userId,
                  selectedMember.avatar,
                )}
              />
            </Avatar>
            <div className="min-w-0">
              <h2
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: `#${selectedMemberColor}` }}
              >
                {selectedMember.name}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                Szczegóły członka
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {isOwner && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1.5 rounded-md transition-colors bg-amber-500/10">
                      <Crown className="size-4 text-amber-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
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
                      >
                        <IconComponent
                          className={cn("size-4", category.color)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
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
            <div className="ml-2">
              <MemberSyncButton member={selectedMember} />
            </div>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <MemberData member={selectedMember} />
      </ScrollArea>
    </div>
  );
};
