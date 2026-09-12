import { TimersUnderBag } from "@/features/timers/components/timers-under-bag";
import { TimersWindow } from "@/features/timers/components/timers-window";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { useTimerBehaviorSettings } from "@/features/timers/settings/use-timer-settings";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";

export const Timers = () => {
  useTimersSocket();

  const open = useWindowsStore((state) => state.timers.open);
  const { behavior, ready, isError } = useTimerBehaviorSettings();
  const gameInterface = useGameStore((state) => state.game?.interface);

  const isUnderBag =
    behavior.generalConfig.timersUnderBag && gameInterface === "ni";

  const { shouldRender } = useWindowPresence(open);

  // Wait for the stored settings so the window does not mount and then jump
  // under the bag, or paint default colours before the user's ones arrive.
  if (!ready && !isError) {
    return null;
  }

  if (isUnderBag) {
    return <TimersUnderBag />;
  }

  if (!shouldRender) {
    return null;
  }

  return <TimersWindow isOpen={open} />;
};
