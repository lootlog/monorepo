import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { OnlinePlayersList } from "@/features/online-players/components/online-players-list";
import { useWindowsStore } from "@/store/windows.store";

export const OnlinePlayers = () => {
  const open = useWindowsStore((state) => state["online-players"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

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
