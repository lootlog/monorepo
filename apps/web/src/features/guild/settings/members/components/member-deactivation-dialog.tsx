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
import { Button } from "@lootlog/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetMemberLootlogConfigSummaryQueryKey,
  useMembersControllerDeactivateMember,
  type MemberResponseDto as GuildMember,
} from "@lootlog/client/main";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ComponentProps } from "react";

type MemberDeactivationDialogProps = {
  guildId: string;
  member: Pick<GuildMember, "userId" | "name">;
  onClose: () => void;
  onDeactivated?: (member: GuildMember) => void;
  finalFocus?: ComponentProps<typeof AlertDialogContent>["finalFocus"];
};

export const MemberDeactivationDialog = ({
  guildId,
  member,
  onClose,
  onDeactivated,
  finalFocus,
}: MemberDeactivationDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deactivateMemberMutation = useMembersControllerDeactivateMember({
    mutation: {
      onSuccess: (data, variables) => {
        const currentGuildId = variables.pathParams.guildId;

        onClose();
        onDeactivated?.(data);
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
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !deactivateMemberMutation.isPending) onClose();
      }}
    >
      <AlertDialogContent finalFocus={finalFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("settings.members.deactivateConfirmTitle", {
              name: member.name,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("settings.members.deactivateConfirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivateMemberMutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deactivateMemberMutation.isPending}
            render=<Button loading={deactivateMemberMutation.isPending} />
            onClick={(event) => {
              event.preventBaseUIHandler();

              if (deactivateMemberMutation.isPending) {
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
            {t("settings.members.deactivate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
