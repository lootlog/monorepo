import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetMemberLootlogConfigSummaryQueryKey,
  useMembersControllerDeactivateMember,
  type MemberResponseDto as GuildMember,
} from "@lootlog/client/main";

import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";
import type { ComponentProps } from "react";

type MemberDeactivationDialogProps = {
  guildId: string;
  member: Pick<GuildMember, "userId" | "name">;
  onClose: () => void;
  onDeactivated?: (member: GuildMember) => void;
  finalFocus?: ComponentProps<typeof ConfirmDialog>["finalFocus"];
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
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      finalFocus={finalFocus}
      variant="default"
      title={t("settings.members.deactivateConfirmTitle", {
        name: member.name,
      })}
      description={t("settings.members.deactivateConfirmDescription")}
      confirmButtonLabel={t("settings.members.deactivate")}
      cancelButtonLabel={t("common.cancel")}
      onConfirm={async () => {
        await deactivateMemberMutation.mutateAsync({
          pathParams: {
            guildId,
            discordId: member.userId,
          },
        });
      }}
    />
  );
};
