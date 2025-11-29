import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
import { useResetTimer } from "@/hooks/api/use-reset-timer";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import type { Guild } from "@/hooks/api/use-guild";
import { useUserSettings } from "@/hooks/api/use-timers-settings";

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
    enableTimerSound,
    disableTimerSound,
    soundEnabledTimers,
  } = useUserSettings({
    guildIds: [settingsKey, "global"].filter(Boolean) as string[],
  });
  const { mutate: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();

  const isPinned = pinnedTimers[settingsKey]?.includes(timer.npc.name);
  const isSoundEnabled = soundEnabledTimers[settingsKey]?.includes(
    timer.npc.name,
  );

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

  const handleToggleTimerSound = () => {
    if (!settingsKey) return;
    if (isSoundEnabled) {
      disableTimerSound(settingsKey, timer.npc.name);
    } else {
      enableTimerSound(settingsKey, timer.npc.name);
    }
  };

  const handleRestartTimer = () => {
    if (!world) return;

    if (timersGrouping && timer.mergedGuildIds) {
      timer.mergedGuildIds.forEach(({ guildId, npcId }) => {
        resetTimer({
          world,
          npcId,
          guildId,
        });
      });
      return;
    }

    resetTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const handleDeleteTimer = (guildId: string, npcId: number) => {
    if (!world) return;

    deleteTimer({
      world,
      npcId,
      guildId,
    });
  };

  return {
    isPinned,
    isSoundEnabled,
    handleHideTimer,
    handleHideTimerForAll,
    handleShowTimer,
    handleShowTimerForAll,
    handlePinTimer,
    handlePinTimerForAll,
    handleUnpinTimerForAll,
    handleTimerColorChange,
    handleToggleTimerSound,
    handleRestartTimer,
    handleDeleteTimer,
  };
};
