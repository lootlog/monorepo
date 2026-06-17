import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lootlog/ui/components/alert-dialog";
import { Button } from "@lootlog/ui/components/button";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetMemberLootlogConfigSummaryQueryKey,
  useMembersControllerDeactivateMember,
} from "@/lib/api/generated/main/members/members";
import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";

export type MemberDeactivationButtonProps = {
  member: GuildMember;
  onDeactivated: (member: GuildMember) => void;
  className?: string;
};

export const MemberDeactivationButton = ({
  member,
  onDeactivated,
  className,
}: MemberDeactivationButtonProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const deactivateMemberMutation = useMembersControllerDeactivateMember({
    mutation: {
      onSuccess: (data, variables) => {
        const currentGuildId = variables.pathParams.guildId;

        onDeactivated(data);
        toast.success(t("settings.members.deactivateSuccess"));

        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: getMembersControllerGetGuildMembersQueryKey({
              guildId: currentGuildId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: getMembersControllerGetMemberLootlogConfigSummaryQueryKey(
              {
                guildId: currentGuildId,
                discordId: data.userId,
              },
            ),
          }),
        ]);
      },
      onError: () => {
        toast.error(t("settings.members.deactivateError"));
      },
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          className={cn(className)}
          disabled={!member.active || deactivateMemberMutation.isPending}
        >
          <UserX className="size-4" />
          {deactivateMemberMutation.isPending
            ? t("settings.members.deactivatePending")
            : t("settings.members.deactivate")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("settings.members.deactivateConfirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("settings.members.deactivateConfirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!guildId || deactivateMemberMutation.isPending}
            onClick={() => {
              if (!guildId) {
                return;
              }

              deactivateMemberMutation.mutate({
                pathParams: {
                  guildId,
                  discordId: member.userId,
                },
              });
            }}
          >
            {deactivateMemberMutation.isPending
              ? t("settings.members.deactivatePending")
              : t("settings.members.deactivate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
