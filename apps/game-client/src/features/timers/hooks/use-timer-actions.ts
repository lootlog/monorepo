import {
  useTimersControllerDeleteTimer,
  useTimersControllerResetTimer,
} from "@/lib/api/generated/main/timers/timers";
import { isApiError } from "@/lib/api-client";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimersStore } from "@/store/timers.store";
import { getFixedT } from "@/i18n/get-fixed-t";

export const useTimerActions = (
  timer: TimerWithTimeLeft,
  settingsKey: string,
  world: string | undefined,
  guildIds: string[],
  timersGrouping = false,
) => {
  const t = getFixedT("timers");
  const {
    hideTimer,
    revealTimer,
    pinTimer,
    unpinTimer,
    pinnedTimers,
    setTimerColor,
  } = useTimersStore();
  const { mutateAsync: resetTimer } = useTimersControllerResetTimer();
  const { mutate: deleteTimer } = useTimersControllerDeleteTimer();
  const getResetTimerErrorMessage = (error: unknown) => {
    const apiMessage =
      isApiError(error) &&
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string"
        ? error.data.message
        : undefined;

    if (apiMessage === "EVENT_TIMER_CANNOT_BE_RESET") {
      return t("messages.resetEventWindowForbidden");
    }

    return t("messages.resetFailed", { name: timer.npc.name });
  };
  const getDeleteTimerErrorMessage = (error: unknown) => {
    const apiMessage =
      isApiError(error) &&
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string"
        ? error.data.message
        : undefined;

    if (apiMessage === "EVENT_TIMER_MUST_USE_EVENT_CLOSE") {
      return t("messages.deleteEventWindowForbidden");
    }

    return t("messages.deleteFailed", { name: timer.npc.name });
  };

  const isPinned = pinnedTimers[settingsKey]?.includes(timer.npc.name);

  const handleHideTimer = () => {
    if (!settingsKey) return;
    hideTimer(settingsKey, timer.npc.name);
  };

  const handleHideTimerForAll = () => {
    if (!settingsKey || guildIds.length === 0) return;

    guildIds.forEach((guildId) => {
      hideTimer(guildId, timer.npc.name);
    });

    hideTimer("global", timer.npc.name);
  };

  const handleShowTimer = () => {
    if (!settingsKey) return;
    revealTimer(settingsKey, timer.npc.name);
  };

  const handleShowTimerForAll = () => {
    if (!settingsKey || guildIds.length === 0) return;

    guildIds.forEach((guildId) => {
      revealTimer(guildId, timer.npc.name);
    });

    revealTimer("global", timer.npc.name);
  };

  const handlePinTimer = () => {
    if (!settingsKey) return;

    if (isPinned) {
      unpinTimer(settingsKey, timer.npc.name);
      return;
    }
    pinTimer(settingsKey, timer.npc.name);
  };

  const handlePinTimerForAll = () => {
    if (!settingsKey || guildIds.length === 0) return;

    guildIds.forEach((guildId) => {
      pinTimer(guildId, timer.npc.name);
    });

    pinTimer("global", timer.npc.name);
  };

  const handleUnpinTimerForAll = () => {
    if (!settingsKey || guildIds.length === 0) return;
    guildIds.forEach((guildId) => {
      unpinTimer(guildId, timer.npc.name);
    });
    unpinTimer("global", timer.npc.name);
  };

  const handleTimerColorChange = (color?: string) => {
    setTimerColor(timer.npc.name, color);
  };

  const handleRestartTimer = async () => {
    if (!world) return;

    try {
      if (timersGrouping && timer.mergedGuildIds) {
        await Promise.all(
          timer.mergedGuildIds.flatMap(({ guildId, timerKey }) =>
            timerKey
              ? [
                  resetTimer({
                    pathParams: {
                      guildId,
                      timerIdentifier: timerKey,
                    },
                    data: {
                      world,
                    },
                  }),
                ]
              : [],
          ),
        );
      } else {
        await resetTimer({
          pathParams: {
            guildId: timer.guildId,
            timerIdentifier: timer.timerKey,
          },
          data: {
            world,
          },
        });
      }

      window.message?.(t("messages.resetSuccess", { name: timer.npc.name }));
    } catch (error) {
      window.message?.(getResetTimerErrorMessage(error));
    }
  };

  const handleDeleteTimer = (guildId: string, timerKey: string) => {
    if (!world) return;

    deleteTimer(
      {
        pathParams: {
          guildId,
          timerIdentifier: timerKey,
        },
        params: world ? { world } : undefined,
      },
      {
        onSuccess: () => {
          window.message?.(
            t("messages.deleteSuccess", { name: timer.npc.name }),
          );
        },
        onError: (error) => {
          window.message?.(getDeleteTimerErrorMessage(error));
        },
      },
    );
  };

  return {
    isPinned,
    handleHideTimer,
    handleHideTimerForAll,
    handleShowTimer,
    handleShowTimerForAll,
    handlePinTimer,
    handlePinTimerForAll,
    handleUnpinTimerForAll,
    handleTimerColorChange,
    handleRestartTimer,
    handleDeleteTimer,
  };
};
