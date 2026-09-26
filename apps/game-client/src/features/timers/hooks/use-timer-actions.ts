import { toast } from "sonner";
import {
  timersControllerDeleteTimer,
  timersControllerResetTimer,
} from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { buildCurrentTimerActorCharacterPayload } from "@/lib/api/generated-helpers";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimersStore } from "@/store/timers.store";
import { getFixedT } from "@/i18n/get-fixed-t";
import { useShallow } from "zustand/react/shallow";
import { getTimerResetScopes } from "../utils/get-timer-reset-scopes";
import { invalidateTimerHistory } from "../utils/invalidate-timer-history";

export const useTimerActions = (
  timer: TimerWithTimeLeft,
  settingsKey: string,
  world: string | undefined,
  guildIds: string[],
  timersGrouping = false,
) => {
  const t = getFixedT("timers");
  const queryClient = useQueryClient();
  const actionInFlight = useRef(false);

  const failedResetScopes = useRef<{
    identity: string;
    scopes: ReturnType<typeof getTimerResetScopes>;
  } | null>(null);

  const {
    hideTimer,
    revealTimer,
    pinTimer,
    unpinTimer,
    setTimerColor,
    showExpiredTimerAlways,
    hideExpiredTimerAlways,
    isPinned,
    isAlwaysVisibleExpiredTimer,
  } = useTimersStore(
    useShallow((state) => ({
      hideTimer: state.hideTimer,
      revealTimer: state.revealTimer,
      pinTimer: state.pinTimer,
      unpinTimer: state.unpinTimer,
      setTimerColor: state.setTimerColor,
      showExpiredTimerAlways: state.showExpiredTimerAlways,
      hideExpiredTimerAlways: state.hideExpiredTimerAlways,
      isPinned:
        state.pinnedTimers[settingsKey]?.includes(timer.npc.name) ?? false,
      isAlwaysVisibleExpiredTimer:
        state.alwaysVisibleExpiredTimers[timer.world]?.includes(
          timer.timerKey,
        ) ?? false,
    })),
  );

  const getResetTimerErrorMessage = (cause: unknown) => {
    const apiMessage = getApiErrorStringField(cause, "message");

    if (apiMessage === "EVENT_TIMER_CANNOT_BE_RESET") {
      return t("messages.resetEventWindowForbidden");
    }

    return t("messages.resetFailed", { name: timer.npc.name });
  };

  const getDeleteTimerErrorMessage = (cause: unknown) => {
    const apiMessage = getApiErrorStringField(cause, "message");

    if (apiMessage === "EVENT_TIMER_MUST_USE_EVENT_CLOSE") {
      return t("messages.deleteEventWindowForbidden");
    }

    return t("messages.deleteFailed", { name: timer.npc.name });
  };

  const handleHideTimer = () => {
    if (!settingsKey) return;
    hideTimer(settingsKey, timer.npc.name);
  };

  const applyToAllTimerScopes = (action: typeof hideTimer) => {
    if (!settingsKey || guildIds.length === 0) return;
    guildIds.forEach((guildId) => action(guildId, timer.npc.name));
    action("global", timer.npc.name);
  };

  const handleHideTimerForAll = () => applyToAllTimerScopes(hideTimer);

  const handleShowTimer = () => {
    if (!settingsKey) return;
    revealTimer(settingsKey, timer.npc.name);
  };

  const handleShowTimerForAll = () => applyToAllTimerScopes(revealTimer);

  const handlePinTimer = () => {
    if (!settingsKey) return;

    if (isPinned) {
      unpinTimer(settingsKey, timer.npc.name);

      return;
    }

    pinTimer(settingsKey, timer.npc.name);
  };

  const handlePinTimerForAll = () => applyToAllTimerScopes(pinTimer);

  const handleUnpinTimerForAll = () => applyToAllTimerScopes(unpinTimer);

  const handleTimerColorChange = (color?: string) => {
    setTimerColor(timer.npc.name, color);
  };

  const handleToggleAlwaysVisibleExpiredTimer = () => {
    if (isAlwaysVisibleExpiredTimer) {
      hideExpiredTimerAlways(timer.world, timer.timerKey);

      return;
    }

    showExpiredTimerAlways(timer.world, timer.timerKey);
  };

  const { mutateAsync: restartTimer, isPending: isRestartingTimer } =
    useMutation({
      mutationFn: async (resetWorld: string) => {
        const actorCharacter = buildCurrentTimerActorCharacterPayload();
        const originalScopes = getTimerResetScopes(timer, timersGrouping);

        const scopeIdentities = originalScopes
          .map(({ guildId, timerIdentifier }) =>
            JSON.stringify([guildId, timerIdentifier]),
          )
          .sort();

        const identity = JSON.stringify([resetWorld, scopeIdentities]);

        const scopes =
          failedResetScopes.current?.identity === identity
            ? failedResetScopes.current.scopes
            : originalScopes;

        const results = await Promise.allSettled(
          scopes.map(async (scope) => {
            const result = await timersControllerResetTimer(scope, {
              world: resetWorld,
              actorCharacter,
            });

            void invalidateTimerHistory(queryClient, {
              guildId: scope.guildId,
              world: resetWorld,
              timerKey: scope.timerIdentifier,
            });

            return result;
          }),
        );

        const failedScopes = scopes.filter(
          (_scope, index) => results[index]?.status === "rejected",
        );

        failedResetScopes.current =
          failedScopes.length > 0 ? { identity, scopes: failedScopes } : null;

        return results;
      },
      onSuccess: (results) => {
        const failures = results.filter(
          (result) => result.status === "rejected",
        );

        if (failures.length === 0) {
          toast.success(t("messages.resetSuccess", { name: timer.npc.name }));
        } else if (failures.length === results.length) {
          toast.error(getResetTimerErrorMessage(failures[0]?.reason));
        } else {
          toast.error(
            t("messages.resetPartialFailure", {
              name: timer.npc.name,
              succeeded: results.length - failures.length,
              failed: failures.length,
            }),
          );
        }
      },
      onError: (error) => {
        toast.error(getResetTimerErrorMessage(error));
      },
    });

  const { mutateAsync: deleteTimer, isPending: isDeletingTimer } = useMutation({
    mutationFn: ({
      guildId,
      timerKey,
      deleteWorld,
    }: {
      guildId: string;
      timerKey: string;
      deleteWorld: string;
    }) =>
      timersControllerDeleteTimer(
        { guildId, timerIdentifier: timerKey },
        { world: deleteWorld },
      ),
    onSuccess: (_result, { guildId, timerKey, deleteWorld }) => {
      void invalidateTimerHistory(queryClient, {
        guildId,
        timerKey,
        world: deleteWorld,
      });
      toast.success(t("messages.deleteSuccess", { name: timer.npc.name }));
    },
    onError: (error) => {
      toast.error(getDeleteTimerErrorMessage(error));
    },
  });

  const handleRestartTimer = () => {
    if (!world || actionInFlight.current) return Promise.resolve(false);
    actionInFlight.current = true;

    return restartTimer(world)
      .then(
        (results) =>
          results.length > 0 &&
          results.every((result) => result.status === "fulfilled"),
      )
      .catch(() => false)
      .finally(() => {
        actionInFlight.current = false;
      });
  };

  const handleDeleteTimer = (guildId: string, timerKey: string) => {
    if (!world || actionInFlight.current) return Promise.resolve(false);
    actionInFlight.current = true;

    return deleteTimer({ guildId, timerKey, deleteWorld: world })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        actionInFlight.current = false;
      });
  };

  return {
    beginRestartAttempt: () => {
      failedResetScopes.current = null;
    },
    isRestartingTimer,
    isDeletingTimer,
    isPinned,
    isAlwaysVisibleExpiredTimer,
    handleHideTimer,
    handleHideTimerForAll,
    handleShowTimer,
    handleShowTimerForAll,
    handlePinTimer,
    handlePinTimerForAll,
    handleUnpinTimerForAll,
    handleTimerColorChange,
    handleToggleAlwaysVisibleExpiredTimer,
    handleRestartTimer,
    handleDeleteTimer,
  };
};
