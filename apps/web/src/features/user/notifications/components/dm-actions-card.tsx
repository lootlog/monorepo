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
import { Card } from "@lootlog/ui/components/card";
import {
  invalidateNotificationsUserControllerGetUserTargets,
  invalidateNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerCreateUserTarget,
  useNotificationsUserControllerTriggerUserTargetTest,
  useNotificationsUserControllerUpdateUserTarget,
} from "@lootlog/api-client/react-query/main/notifications";
import type { NotificationTargetWithTestTriggerResponseDto } from "@lootlog/api-client/models/main/notification-target-with-test-trigger-response-dto";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { NotificationTargetType } from "@lootlog/types";

type DmActionsCardProps = {
  dmTarget: NotificationTargetWithTestTriggerResponseDto | null;
  onAddWatch: () => void;
};

export const DmActionsCard = ({ dmTarget, onAddWatch }: DmActionsCardProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createUserTarget = useNotificationsUserControllerCreateUserTarget({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateNotificationsUserControllerGetUserTargets(queryClient),
          invalidateNotificationsUserControllerGetWatchedItems(queryClient),
        ]);
      },
    },
  });
  const updateUserTarget = useNotificationsUserControllerUpdateUserTarget({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateNotificationsUserControllerGetUserTargets(queryClient),
          invalidateNotificationsUserControllerGetWatchedItems(queryClient),
        ]);
      },
    },
  });
  const triggerUserTargetTest =
    useNotificationsUserControllerTriggerUserTargetTest({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            invalidateNotificationsUserControllerGetUserTargets(queryClient),
            invalidateNotificationsUserControllerGetWatchedItems(queryClient),
          ]);
        },
      },
    });

  const hasDmTarget = dmTarget !== null;
  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const isDmActionPending =
    createUserTarget.isPending ||
    updateUserTarget.isPending ||
    triggerUserTargetTest.isPending;

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
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
          <MessageCircleMore className="size-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold">
          {t("settings.userNotifications.dm.title")}
        </h3>
        <Badge
          variant={hasActiveDm ? "default" : "secondary"}
          className="ml-auto"
        >
          {hasActiveDm
            ? t("settings.userNotifications.dm.active")
            : t("settings.userNotifications.dm.actionRequired")}
        </Badge>
      </div>

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
          {hasDmTarget && !dmTarget.canSend
            ? t("settings.userNotifications.dm.cannotSendHint")
            : hasDmTarget
              ? t("settings.userNotifications.dm.reactivateHint")
              : t("settings.userNotifications.dm.requiredHint")}
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
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={
                      isDmActionPending || dmTarget?.testTrigger.remaining === 0
                    }
                    onClick={handleTriggerDmTest}
                  >
                    <FlaskConical className="size-4" />
                    {t("settings.userNotifications.dm.test")}
                  </Button>
                </span>
              </TooltipTrigger>
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
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDmActionPending}
                  onClick={handleDisableDm}
                >
                  <BellOff className="size-4" />
                  {t("settings.userNotifications.dm.deactivate")}
                </Button>
              </TooltipTrigger>
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
          >
            <BellRing className="size-4" />
            {t("settings.userNotifications.dm.configure")}
          </Button>
        )}
      </div>
    </Card>
  );
};
