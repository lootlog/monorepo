import {
  timersControllerDeleteTimer,
  timersControllerResetTimer,
} from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { buildCurrentTimerActorCharacterPayload } from "@/lib/api/generated-helpers";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/features/timers/settings/timer-settings-documents";
import {
  setExpiredTimerAlwaysVisible,
  setTimerColor,
  setTimerHidden,
  setTimerPinned,
} from "@/features/timers/settings/timer-settings-writers";
import { getFixedT } from "@/i18n/get-fixed-t";

export type TimerActionsContext = {
  /** Key of the hidden/pinned lists the tile belongs to. */
  settingsKey: string;
  world: string | undefined;
  /** Every accessible organization, for the "everywhere" variants. */
  guildIds: string[];
  isGrouping: boolean;
  pinnedTimers: readonly string[];
  alwaysVisibleExpiredTimers: Record<string, string[]>;
};

export const useTimerActions = (
  timer: TimerWithTimeLeft,
  {
    settingsKey,
    world,
    guildIds,
    isGrouping: timersGrouping,
    pinnedTimers,
    alwaysVisibleExpiredTimers,
  }: TimerActionsContext,
) => {
  const t = getFixedT("timers");
  const isPinned = pinnedTimers.includes(timer.npc.name);

  const isAlwaysVisibleExpiredTimer =
    alwaysVisibleExpiredTimers[timer.world]?.includes(timer.timerKey) ?? false;

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
    setTimerHidden(settingsKey, timer.npc.name, true);
  };

  const applyToAllTimerScopes = (
    action: (settingsKey: string, npcName: string) => void,
  ) => {
    if (!settingsKey || guildIds.length === 0) return;
    guildIds.forEach((guildId) => action(guildId, timer.npc.name));
    action(GLOBAL_TIMER_SETTINGS_KEY, timer.npc.name);
  };

  const handleHideTimerForAll = () =>
    applyToAllTimerScopes((key, npcName) => setTimerHidden(key, npcName, true));

  const handleShowTimer = () => {
    if (!settingsKey) return;
    setTimerHidden(settingsKey, timer.npc.name, false);
  };

  const handleShowTimerForAll = () =>
    applyToAllTimerScopes((key, npcName) =>
      setTimerHidden(key, npcName, false),
    );

  const handlePinTimer = () => {
    if (!settingsKey) return;
    setTimerPinned(settingsKey, timer.npc.name, !isPinned);
  };

  const handlePinTimerForAll = () =>
    applyToAllTimerScopes((key, npcName) => setTimerPinned(key, npcName, true));

  const handleUnpinTimerForAll = () =>
    applyToAllTimerScopes((key, npcName) =>
      setTimerPinned(key, npcName, false),
    );

  const handleTimerColorChange = (color?: string) => {
    setTimerColor(timer.npc.name, color);
  };

  const handleToggleAlwaysVisibleExpiredTimer = () => {
    setExpiredTimerAlwaysVisible(
      timer.world,
      timer.timerKey,
      !isAlwaysVisibleExpiredTimer,
    );
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
