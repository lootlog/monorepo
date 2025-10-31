import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
import { useResetTimer } from "@/hooks/api/use-reset-timer";
import type { Timer } from "@/hooks/api/use-timers";
import type { Guild } from "@/hooks/api/use-guild";
import { useTimersStore } from "@/store/timers.store";

export const useTimerActions = (
  timer: Timer,
  settingsKey: string,
  world: string | undefined,
  guilds: Guild[] | undefined,
) => {
  const { hideTimer, pinTimer, unpinTimer, pinnedTimers, setTimerColor } =
    useTimersStore();
  const { mutate: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();

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

  const handleRestartTimer = () => {
    if (!world) return;

    resetTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const handleDeleteTimer = (guildIdOverride?: string) => {
    if (!world) return;

    deleteTimer({
      world,
      npcId: timer.npc.id,
      guildId: guildIdOverride || timer.guildId,
    });
  };

  return {
    isPinned,
    handleHideTimer,
    handleHideTimerForAll,
    handlePinTimer,
    handlePinTimerForAll,
    handleUnpinTimerForAll,
    handleTimerColorChange,
    handleRestartTimer,
    handleDeleteTimer,
  };
};
