import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";

export const AddTimer = () => {
  const {
    "add-timer": { open },
    toggleOpen,
    setOpen,
  } = useWindowsStore();

  return (
    open && (
      <DraggableWindow
        id="add-timer"
        title="Dodaj timer"
        onClose={() => setOpen("add-timer", false)}
      >
        xdd
      </DraggableWindow>
    )
  );
};
