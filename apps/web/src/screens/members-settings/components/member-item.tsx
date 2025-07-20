import { GuildMember } from "@/hooks/api/use-guild-member";
import { MemberSyncButton } from "@/screens/members-settings/components/member-sync-button";
import { cn } from "@/utils/cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import { EllipsisVertical } from "lucide-react";
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
        "border-b flex flex-row justify-between py-4 px-6 h-12 items-center hover:bg-[#181C25] cursor-pointer text-sm box-border",
        {
          "bg-[#181C25]": active,
        }
      )}
      onClick={onSelect}
    >
      <div className="flex gap-4 items-center">
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl} />
        </Avatar>
        <div>
          <div className="font-semibold" style={{ color: `#${color}` }}>
            {member.name}{" "}
            <span className="text-white">{isOwner ? "(właściciel)" : ""}</span>
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
