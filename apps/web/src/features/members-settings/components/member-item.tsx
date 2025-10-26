import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { MemberSyncButton } from "@/features/members-settings/components/member-sync-button";
import { cn } from "@/utils/cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { useRefreshStatus } from "@/features/members-settings/contexts/refresh-status-context";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  AlertCircle,
  EllipsisVertical,
  CheckCircle2,
  XCircle,
  UserX,
} from "lucide-react";
import { useState, type FC } from "react";
import { useDeactivateMember } from "@/hooks/api/members/use-deactivate-member";

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
  const { refreshedIds, failedIds } = useRefreshStatus();
  const { mutate: deactivate, isPending } = useDeactivateMember();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isRefreshed = refreshedIds.has(member.userId);
  const isFailed = failedIds.has(member.userId);

  const handleDeactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleConfirmDeactivate = () => {
    deactivate(member.userId);
    setIsDialogOpen(false);
  };

  return (
    <div
      key={member.id}
      className={cn(
        "border-b flex flex-row justify-between py-4 px-6 items-center hover:bg-secondary cursor-pointer text-sm box-border",
        {
          "bg-secondary": active,
          "opacity-50": !member.active,
        },
      )}
      onClick={onSelect}
    >
      <div className="flex gap-4 items-center">
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl} />
        </Avatar>
        <div className="flex flex-col">
          <div
            className="font-semibold flex items-center gap-2"
            style={{ color: `#${color}` }}
          >
            <span>
              {member.name}{" "}
              <span className="text-white">
                {isOwner ? "(właściciel)" : ""}
              </span>
            </span>
            {isRefreshed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CheckCircle2 className="w-4 h-4 text-green-500 animate-in fade-in zoom-in duration-300" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Odświeżono pomyślnie</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isFailed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <XCircle className="w-4 h-4 text-red-500 animate-in fade-in zoom-in duration-300" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Błąd podczas odświeżania</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {member.isStale && !isRefreshed && !isFailed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {member.staleWarning || "Dane mogą być nieaktualne"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Odświeżono {getRelativeTime(member.updatedAt)}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <MemberSyncButton member={member} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-8 rounded-full"
                size="sm"
                variant="secondary"
                onClick={(e) => e.stopPropagation()}
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDeactivateClick}
                disabled={isPending || !member.active}
                className="text-red-600 focus:text-red-600"
              >
                <UserX className="w-4 h-4 mr-2" />
                Dezaktywuj
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dezaktywacja członka</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz dezaktywować {member.name}? Ta akcja
              spowoduje, że członek nie będzie już aktywny w gildii.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivate}>
              Dezaktywuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
