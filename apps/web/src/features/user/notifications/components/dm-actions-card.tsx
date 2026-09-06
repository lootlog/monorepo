import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import { format } from "date-fns";
import {
  BellOff,
  BellRing,
  FlaskConical,
  MessageCircleMore,
  Package,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@/components/common/section-card/section-card";
import {
  useNotificationsUserControllerCreateUserTarget,
  useNotificationsUserControllerTriggerUserTargetTest,
  useNotificationsUserControllerUpdateUserTarget,
} from "@lootlog/client/main";
import type { NotificationTargetWithTestTriggerResponseDto } from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { NotificationTargetType } from "@lootlog/schema/notifications";

type DmActionsCardProps = {
  dmTarget: NotificationTargetWithTestTriggerResponseDto | null;
  onAddWatch: () => void;
};

const resolveDmActionState = (
  dmTarget: NotificationTargetWithTestTriggerResponseDto | null,
  pendingStates: {
    create: boolean;
    update: boolean;
    test: boolean;
    active: boolean | undefined;
  },
) => ({
  hasActiveDm: Boolean(dmTarget?.active && dmTarget.canSend),
  hasDmTarget: dmTarget !== null,
  isDmActionPending:
    pendingStates.create || pendingStates.update || pendingStates.test,
  isEnablePending:
    pendingStates.create ||
    (pendingStates.update && pendingStates.active === true),
  isDisablePending: pendingStates.update && pendingStates.active === false,
});

const getDmHint = (
  hasDmTarget: boolean,
  canSend: boolean | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) => {
  if (!hasDmTarget) return t("settings.userNotifications.dm.requiredHint");
  if (!canSend) return t("settings.userNotifications.dm.cannotSendHint");
  return t("settings.userNotifications.dm.reactivateHint");
};

export const DmActionsCard = ({ dmTarget, onAddWatch }: DmActionsCardProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createUserTarget = useNotificationsUserControllerCreateUserTarget({
    mutation: {
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    },
  });
  const updateUserTarget = useNotificationsUserControllerUpdateUserTarget({
    mutation: {
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    },
  });
  const triggerUserTargetTest =
    useNotificationsUserControllerTriggerUserTargetTest({
      mutation: {
        onSuccess: async () => {
          await invalidateUserNotificationQueries(queryClient);
        },
      },
    });

  const {
    hasActiveDm,
    hasDmTarget,
    isDmActionPending,
    isEnablePending,
    isDisablePending,
  } = resolveDmActionState(dmTarget, {
    create: createUserTarget.isPending,
    update: updateUserTarget.isPending,
    test: triggerUserTargetTest.isPending,
    active: updateUserTarget.variables?.data.active,
  });

  const handleEnableDm = async () => {
    try {
      if (dmTarget) {
        await updateUserTarget.mutateAsync({
          pathParams: { targetId: dmTarget.id },
          data: { active: true },
        });
      } else {
        await createUserTarget.mutateAsync({
          data: { targetType: NotificationTargetType.DM },
        });
      }

      toast.success(t("settings.userNotifications.toasts.dmEnabled"));
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.toasts.dmEnableError"),
      );
    }
  };

  const handleDisableDm = async () => {
    if (!dmTarget) {
      return;
    }

    try {
      await updateUserTarget.mutateAsync({
        pathParams: { targetId: dmTarget.id },
        data: { active: false },
      });
      toast.success(t("settings.userNotifications.toasts.dmDisabled"));
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.toasts.dmDisableError"),
      );
    }
  };

  const handleTriggerDmTest = async () => {
    if (!dmTarget || !hasActiveDm) {
      return;
    }

    try {
      await triggerUserTargetTest.mutateAsync({
        pathParams: { targetId: dmTarget.id },
      });
      toast.success(t("settings.userNotifications.toasts.dmTestTriggered"));
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.toasts.dmTestTriggerError"),
      );
    }
  };

  return (
    <SectionCard>
      <SectionCardHeader
        icon={MessageCircleMore}
        title={t("settings.userNotifications.dm.title")}
        actions={
          <Badge
            variant={hasActiveDm ? "default" : "secondary"}
            className="ml-auto"
          >
            {hasActiveDm
              ? t("settings.userNotifications.dm.active")
              : t("settings.userNotifications.dm.actionRequired")}
          </Badge>
        }
      />
      <SectionCardContent className="space-y-3">
        {dmTarget?.displayName ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.userNotifications.dm.targetLabel", {
              name: dmTarget.displayName,
            })}
          </p>
        ) : null}

        {!hasActiveDm ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-500">
            <ShieldAlert className="size-3.5 shrink-0" />
            {getDmHint(hasDmTarget, dmTarget?.canSend, t)}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button size="sm" disabled={!hasActiveDm} onClick={onAddWatch}>
            <Package className="size-4" />
            {t("settings.userNotifications.actions.addWatch")}
          </Button>
          {hasActiveDm ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={
                          isDmActionPending ||
                          dmTarget?.testTrigger.remaining === 0
                        }
                        onClick={handleTriggerDmTest}
                        loading={triggerUserTargetTest.isPending}
                        icon={<FlaskConical className="size-4" />}
                      >
                        {t("settings.userNotifications.dm.test")}
                      </Button>
                    </span>
                  }
                />
                <TooltipContent>
                  <p>
                    {t("settings.userNotifications.dm.testUsage", {
                      used: dmTarget?.testTrigger.used ?? 0,
                      limit: dmTarget?.testTrigger.limit ?? 0,
                      minutes: Math.floor(
                        (dmTarget?.testTrigger.windowSeconds ?? 0) / 60,
                      ),
                    })}
                  </p>
                  {dmTarget?.testTrigger.nextAvailableAt ? (
                    <p className="text-muted-foreground">
                      {t("settings.userNotifications.dm.testNextAvailable", {
                        date: format(
                          new Date(dmTarget.testTrigger.nextAvailableAt),
                          "dd.MM.yyyy HH:mm:ss",
                        ),
                      })}
                    </p>
                  ) : null}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDmActionPending}
                      onClick={handleDisableDm}
                      loading={isDisablePending}
                      icon={<BellOff className="size-4" />}
                    >
                      {t("settings.userNotifications.dm.deactivate")}
                    </Button>
                  }
                />
                <TooltipContent>
                  {t("settings.userNotifications.dm.deactivateHint")}
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Button
              size="sm"
              disabled={isDmActionPending}
              onClick={handleEnableDm}
              loading={isEnablePending}
              icon={<BellRing className="size-4" />}
            >
              {t("settings.userNotifications.dm.configure")}
            </Button>
          )}
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
