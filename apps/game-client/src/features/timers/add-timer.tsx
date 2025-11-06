import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { AddTimerForm } from "@/features/timers/components/add-timer-form";
import { useWindowsStore } from "@/store/windows.store";

export const AddTimer = () => {
  const {
    "add-timer": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatedWindow isOpen={open} windowKey="add-timer">
      <DraggableWindow
        id="add-timer"
        title="Dodaj timer"
        onClose={() => setOpen("add-timer", false)}
        minHeight={300}
      >
        <AddTimerForm />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
