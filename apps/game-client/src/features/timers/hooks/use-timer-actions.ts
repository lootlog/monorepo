import {
  timersControllerDeleteTimer,
  timersControllerResetTimer,
} from "@lootlog/api-client/react-query/main/timers";
import { isApiError } from "@lootlog/api-client/transport";
import { buildCurrentTimerActorCharacterPayload } from "@/lib/api/generated-helpers";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimersStore } from "@/store/timers.store";
import { getFixedT } from "@/i18n/get-fixed-t";
import { useShallow } from "zustand/react/shallow";

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

  const handleToggleAlwaysVisibleExpiredTimer = () => {
    if (isAlwaysVisibleExpiredTimer) {
      hideExpiredTimerAlways(timer.world, timer.timerKey);
      return;
    }

    showExpiredTimerAlways(timer.world, timer.timerKey);
  };

  const handleRestartTimer = async () => {
    if (!world) return;

    try {
      const actorCharacter = buildCurrentTimerActorCharacterPayload();

      if (timersGrouping && timer.mergedGuildIds) {
        await Promise.all(
          timer.mergedGuildIds.flatMap(({ guildId, timerKey }) =>
            timerKey
              ? [
                  timersControllerResetTimer(
                    {
                      guildId,
                      timerIdentifier: timerKey,
                    },
                    {
                      world,
                      actorCharacter,
                    },
                  ),
                ]
              : [],
          ),
        );
      } else {
        await timersControllerResetTimer(
          {
            guildId: timer.guildId,
            timerIdentifier: timer.timerKey,
          },
          {
            world,
            actorCharacter,
          },
        );
      }

      showRuntimeMessage(t("messages.resetSuccess", { name: timer.npc.name }));
    } catch (error) {
      showRuntimeMessage(getResetTimerErrorMessage(error));
    }
  };

  const handleDeleteTimer = (guildId: string, timerKey: string) => {
    if (!world) return;

    void timersControllerDeleteTimer(
      {
        guildId,
        timerIdentifier: timerKey,
      },
      world ? { world } : undefined,
    ).then(
      () => {
        showRuntimeMessage(
          t("messages.deleteSuccess", { name: timer.npc.name }),
        );
      },
      (error) => {
        showRuntimeMessage(getDeleteTimerErrorMessage(error));
      },
    );
  };

  return {
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
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
