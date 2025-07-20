import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { useMemberRefresh } from "@/hooks/api/use-member-refresh";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCcw } from "lucide-react";
import { FC, useCallback } from "react";

export type MemberSyncButtonProps = {
  member: GuildMember;
};

const getRefreshInfo = (member: GuildMember) => {
  const canRefresh = !!member.globalUserId;
  const updatedAt = member?.updatedAt
    ? new Date(member.updatedAt).getTime()
    : 0;
  const canTriggerRefresh =
    updatedAt && updatedAt < Date.now() - REFRESH_PERMISSIONS_TTL;

  let canTriggerRefreshText = "Uprawnienia są aktualne";
  if (canTriggerRefresh) {
    canTriggerRefreshText = "Odśwież swoje uprawnienia";
  } else if (updatedAt) {
    const nextRefreshTime = updatedAt + REFRESH_PERMISSIONS_TTL;
    const timeUntilRefresh = Math.ceil(
      (nextRefreshTime - Date.now()) / (1000 * 60)
    );
    if (timeUntilRefresh > 0) {
      canTriggerRefreshText = `Spróbuj ponownie za ${timeUntilRefresh} min`;
    }
  }

  if (!canRefresh) {
    canTriggerRefreshText =
      "Nie można odświeżyć danych członka (musi się zalogować przez Discord ponownie)";
  }

  return { canRefresh, canTriggerRefresh, canTriggerRefreshText };
};

export const MemberSyncButton: FC<MemberSyncButtonProps> = ({ member }) => {
  const { mutate: refreshMember, isPending } = useMemberRefresh();

  const handleRefresh = useCallback(
    (memberId: string) => {
      refreshMember(
        { memberId },
        {
          onSuccess: () => {},
          onError: () => {},
        }
      );
    },
    [refreshMember]
  );

  const { canRefresh, canTriggerRefresh, canTriggerRefreshText } =
    getRefreshInfo(member);

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
      <TooltipContent>{canTriggerRefreshText}</TooltipContent>
    </Tooltip>
  );
};
