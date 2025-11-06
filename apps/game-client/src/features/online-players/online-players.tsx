import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { OnlinePlayersList } from "@/features/online-players/components/online-players-list";
import { useWindowsStore } from "@/store/windows.store";

export const OnlinePlayers = () => {
  const {
    "online-players": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatedWindow isOpen={open} windowKey="online-players">
      <DraggableWindow
        id="online-players"
        title="Gracze online"
        onClose={() => setOpen("online-players", false)}
        variant="default"
        minHeight={108}
        minWidth={242}
      >
        <OnlinePlayersList />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
