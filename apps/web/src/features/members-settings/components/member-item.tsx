import { GuildMember } from "@/hooks/api/use-guild-member";
import { MemberSyncButton } from "@/features/members-settings/components/member-sync-button";
import { cn } from "@/utils/cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { AlertCircle, EllipsisVertical } from "lucide-react";
import { FC } from "react";

export type MemberItemProps = {
  member: GuildMember;
  active?: boolean;
  onSelect: () => void;
  showActions?: boolean;
  isOwner?: boolean;
};

export const MemberItem: FC<MemberItemProps> = ({
  member,
  active,
  onSelect,
  showActions = true,
  isOwner = false,
}) => {
  const color = getColorFromRole(member.roles);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar);

  return (
    <div
      key={member.id}
      className={cn(
        "border-b flex flex-row justify-between py-4 px-6 h-12 items-center hover:bg-secondary cursor-pointer text-sm box-border",
        {
          "bg-secondary": active,
        }
      )}
      onClick={onSelect}
    >
      <div className="flex gap-4 items-center">
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl} />
        </Avatar>
        <div>
          <div className="font-semibold flex items-center gap-2" style={{ color: `#${color}` }}>
            <span>
              {member.name}{" "}
              <span className="text-white">{isOwner ? "(właściciel)" : ""}</span>
            </span>
            {member.isStale && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{member.staleWarning || "Dane mogą być nieaktualne"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <MemberSyncButton member={member} />
          <div className="flex gap-2">
            <Button
              className="size-8 rounded-full"
              size="sm"
              variant="secondary"
            >
              <EllipsisVertical />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
