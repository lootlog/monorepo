import { TimersView } from "@/features/timers/timers-view";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useTimers } from "@/hooks/api/use-timers";
import { useGameStore } from "@/store/game.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

export const Timers = () => {
  useTimersSocket();

  // The timers stay observed while the window is closed so add-ons reading
  // the public API and live socket updates keep a current snapshot.
  const { world } = useTimersWorld();
  useTimers({ world });

  const open = useWindowsStore((state) => state.timers.open);

  const timersUnderBag = useTimersStore(
    (state) => state.generalConfig.timersUnderBag,
  );

  const gameInterface = useGameStore((state) => state.game?.interface);
  const isUnderBag = timersUnderBag && gameInterface === "ni";
  const { shouldRender: shouldRenderTimersView } = useWindowPresence(open);

  // Under the bag the panel replaces the window, so the same open state, tile
  // and hotkey show and hide it.
  if (isUnderBag) {
    return open ? <TimersView isOpen isUnderBag /> : null;
  }

  if (!shouldRenderTimersView) {
    return null;
  }

  return <TimersView isOpen={open} isUnderBag={false} />;
};
