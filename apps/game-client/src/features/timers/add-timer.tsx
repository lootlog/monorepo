import { DraggableWindow } from "@/components/draggable-window";
import { AddTimerForm } from "@/features/timers/components/add-timer-form";
import { useWindowsStore } from "@/store/windows.store";

export const AddTimer = () => {
  const {
    "add-timer": { open },
    setOpen,
  } = useWindowsStore();

  return (
    open && (
      <DraggableWindow
        id="add-timer"
        title="Dodaj timer"
        onClose={() => setOpen("add-timer", false)}
        resizable={false}
      >
        <AddTimerForm />
      </DraggableWindow>
    )
  );
};
