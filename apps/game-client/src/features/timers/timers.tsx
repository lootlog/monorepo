import { TimersView } from "@/features/timers/timers-view";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { useGameStore } from "@/store/game.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

export const Timers = () => {
  useTimersSocket();

  const open = useWindowsStore((state) => state.timers.open);
  const timersUnderBag = useTimersStore(
    (state) => state.generalConfig.timersUnderBag,
  );
  const gameInterface = useGameStore((state) => state.game?.interface);
  const isUnderBag = timersUnderBag && gameInterface === "ni";
  const { shouldRender: shouldRenderTimersView } = useWindowPresence(open);

  if (isUnderBag) {
    return <TimersView isOpen isUnderBag />;
  }

  if (!shouldRenderTimersView) {
    return null;
  }

  return <TimersView isOpen={open} isUnderBag={false} />;
};
