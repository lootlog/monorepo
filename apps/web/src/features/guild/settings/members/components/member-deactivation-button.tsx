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
} from "@lootlog/client/main";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";

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
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const deactivateMemberMutation = useMembersControllerDeactivateMember({
    mutation: {
      onSuccess: (data, variables) => {
        const currentGuildId = variables.pathParams.guildId;

        setIsOpen(false);
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
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!deactivateMemberMutation.isPending) setIsOpen(open);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            variant="destructive"
            className={cn(className)}
            disabled={!member.active || deactivateMemberMutation.isPending}
          >
            <UserX className="size-4" />
            {t("settings.members.deactivate")}
          </Button>
        }
      />
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
          <AlertDialogCancel disabled={deactivateMemberMutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!guildId || deactivateMemberMutation.isPending}
            render={<Button loading={deactivateMemberMutation.isPending} />}
            onClick={(event) => {
              event.preventBaseUIHandler();
              if (!guildId || deactivateMemberMutation.isPending) {
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
