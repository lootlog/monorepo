import axios from "axios";
import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
import { useResetTimer } from "@/hooks/api/use-reset-timer";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import type { Guild } from "@/hooks/api/use-guild";
import { useTimersStore } from "@/store/timers.store";

export const useTimerActions = (
  timer: TimerWithTimeLeft,
  settingsKey: string,
  world: string | undefined,
  guilds: Guild[] | undefined,
  timersGrouping = false,
) => {
  const {
    hideTimer,
    revealTimer,
    pinTimer,
    unpinTimer,
    pinnedTimers,
    setTimerColor,
  } = useTimersStore();
  const { mutateAsync: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();
  const getResetTimerErrorMessage = (error: unknown) => {
    if (
      axios.isAxiosError<{ message?: string }>(error) &&
      error.response?.data?.message === "EVENT_TIMER_CANNOT_BE_RESET"
    ) {
      return "Nie można zresetować okna eventowego z poziomu timerów.";
    }

    return `Nie udało się zresetować timera ${timer.npc.name}.`;
  };
  const getDeleteTimerErrorMessage = (error: unknown) => {
    if (
      axios.isAxiosError<{ message?: string }>(error) &&
      error.response?.data?.message === "EVENT_TIMER_MUST_USE_EVENT_CLOSE"
    ) {
      return "Nie można usunąć okna eventowego z poziomu timerów.";
    }

    return `Nie udało się usunąć timera ${timer.npc.name}.`;
  };

  const isPinned = pinnedTimers[settingsKey]?.includes(timer.npc.name);

  const handleHideTimer = () => {
    if (!settingsKey) return;
    hideTimer(settingsKey, timer.npc.name);
  };

  const handleHideTimerForAll = () => {
    if (!settingsKey || !guilds) return;

    guilds.forEach((guild) => {
      hideTimer(guild.id, timer.npc.name);
    });

    hideTimer("global", timer.npc.name);
  };

  const handleShowTimer = () => {
    if (!settingsKey) return;
    revealTimer(settingsKey, timer.npc.name);
  };

  const handleShowTimerForAll = () => {
    if (!settingsKey || !guilds) return;

    guilds.forEach((guild) => {
      revealTimer(guild.id, timer.npc.name);
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
    if (!settingsKey || !guilds) return;

    guilds.forEach((guild) => {
      pinTimer(guild.id, timer.npc.name);
    });

    pinTimer("global", timer.npc.name);
  };

  const handleUnpinTimerForAll = () => {
    if (!settingsKey || !guilds) return;
    guilds.forEach((guild) => {
      unpinTimer(guild.id, timer.npc.name);
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
                    world,
                    timerKey,
                    guildId,
                  }),
                ]
              : [],
          ),
        );
      } else {
        await resetTimer({
          world,
          timerKey: timer.timerKey,
          guildId: timer.guildId,
        });
      }

      window.message?.(`Zresetowano timer ${timer.npc.name}.`);
    } catch (error) {
      window.message?.(getResetTimerErrorMessage(error));
    }
  };

  const handleDeleteTimer = (guildId: string, timerKey: string) => {
    if (!world) return;

    deleteTimer(
      {
        world,
        timerKey,
        guildId,
      },
      {
        onSuccess: () => {
          window.message?.(`Usunięto timer ${timer.npc.name}.`);
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
