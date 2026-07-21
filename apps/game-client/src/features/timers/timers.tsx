import { TimersView } from "@/features/timers/timers-view";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { Game } from "@/lib/game";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

export const Timers = () => {
  useTimersSocket();

  const open = useWindowsStore((state) => state.timers.open);
  const timersUnderBag = useTimersStore(
    (state) => state.generalConfig.timersUnderBag,
  );
  const isUnderBag = timersUnderBag && Game.interface === "ni";
  const { shouldRender: shouldRenderTimersView } = useWindowPresence(open);

  if (isUnderBag) {
    return <TimersView isOpen isUnderBag />;
  }

  if (!shouldRenderTimersView) {
    return null;
  }

  return <TimersView isOpen={open} isUnderBag={false} />;
};
