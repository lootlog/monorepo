import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import {
  BellOff,
  BellRing,
  CircleCheck,
  FlaskConical,
  MessageCircleMore,
  TriangleAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import {
  useNotificationsUserControllerCreateUserTarget,
  useNotificationsUserControllerTriggerUserTargetTest,
  useNotificationsUserControllerUpdateUserTarget,
  type NotificationTargetWithTestTriggerResponseDto,
} from "@lootlog/client/main";

import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { NotificationTargetType } from "@lootlog/schema/notifications";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

type DmTargetTileProps = {
  dmTarget: NotificationTargetWithTestTriggerResponseDto | null;
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

/**
 * The player's direct messages as the one channel their watched items send
 * to, tinted like a guild channel that cannot deliver while it is off.
 */
export const DmTargetTile = ({ dmTarget }: DmTargetTileProps) => {
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

  const testTrigger = dmTarget?.testTrigger;

  return (
    // The actions move beside the text once the tile has room for both.
    <div data-list-tile className={cn("@container", LIST_TILE_RULE_CLASS)}>
      <div
        className={cn(
          "flex flex-col gap-3 py-3 @2xl:flex-row @2xl:items-center",
          LIST_TILE_INSET_CLASS,
          !hasActiveDm && "bg-signal-timer/[0.06]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MessageCircleMore
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-sm font-semibold">
                {t("settings.userNotifications.dm.title")}
              </span>
              {hasActiveDm ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                  <CircleCheck aria-hidden className="size-3.5" />
                  {t("settings.userNotifications.dm.active")}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs text-signal-timer">
                  <TriangleAlert aria-hidden className="size-3.5" />
                  {t("settings.userNotifications.dm.actionRequired")}
                </span>
              )}
            </span>
            <span className="text-[13px] leading-5 text-text-supporting">
              {hasActiveDm && dmTarget?.displayName
                ? t("settings.userNotifications.dm.targetLabel", {
                    name: dmTarget.displayName,
                  })
                : getDmHint(hasDmTarget, dmTarget?.canSend, t)}
            </span>
            {hasActiveDm && testTrigger && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {testTrigger.nextAvailableAt
                  ? t("settings.userNotifications.dm.testNextAvailable", {
                      date: timestampToDate(
                        testTrigger.nextAvailableAt,
                        DATE_TIME_WITH_SECONDS_FORMAT,
                      ),
                    })
                  : t("settings.userNotifications.dm.testUsage", {
                      used: testTrigger.used,
                      limit: testTrigger.limit,
                      minutes: Math.floor(testTrigger.windowSeconds / 60),
                    })}
              </span>
            )}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 @2xl:pl-0">
          {hasActiveDm ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isDmActionPending || testTrigger?.remaining === 0}
                onClick={handleTriggerDmTest}
                loading={triggerUserTargetTest.isPending}
                icon=<FlaskConical className="size-4" />
              >
                {t("settings.userNotifications.dm.test")}
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isDmActionPending}
                      onClick={handleDisableDm}
                      loading={isDisablePending}
                      icon=<BellOff className="size-4" />
                    >
                      {t("settings.userNotifications.dm.deactivate")}
                    </Button>
                  }
                />
                <TooltipContent className="max-w-xs">
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
              icon=<BellRing className="size-4" />
            >
              {t("settings.userNotifications.dm.configure")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
