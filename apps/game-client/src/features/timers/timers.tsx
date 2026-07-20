import { AnimatedWindow } from "@/components/animated-window";
import { TimersView } from "@/features/timers/timers-view";
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

  if (isUnderBag) {
    return <TimersView isUnderBag />;
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="timers">
      <TimersView isUnderBag={false} />
    </AnimatedWindow>
  );
};
