import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCcw } from "lucide-react";
import type { FC } from "react";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useMemberRefresh } from "@/hooks/api/members/use-member-refresh";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";

export type MemberSyncButtonProps = {
  member: GuildMember;
};

export const MemberSyncButton: FC<MemberSyncButtonProps> = ({ member }) => {
  const { mutate: refreshMember, isPending } = useMemberRefresh();

  const handleRefresh = (memberId: string) => {
    refreshMember(
      { memberId },
      {
        onSuccess: () => {},
        onError: () => {},
      },
    );
  };

  const canRefresh = Boolean(member.globalUserId);
  const { canTriggerRefresh, canTriggerRefreshText } = getPermissionRefreshInfo(
    member.updatedAt,
  );
  const tooltipText = canRefresh
    ? canTriggerRefreshText
    : "Nie można odświeżyć danych członka (musi się zalogować przez Discord ponownie)";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            className="size-8 rounded-full"
            size="sm"
            variant="secondary"
            disabled={isPending || !canRefresh || !canTriggerRefresh}
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh(member.userId);
            }}
          >
            <RefreshCcw />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};
