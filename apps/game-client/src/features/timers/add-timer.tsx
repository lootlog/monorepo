import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { AddTimerForm } from "@/features/timers/components/add-timer-form";
import { useWindowsStore } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

export const AddTimer = () => {
  const { t } = useTranslation("timers");
  const open = useWindowsStore((state) => state["add-timer"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <AnimatedWindow isOpen={open} windowKey="add-timer">
      <DraggableWindow
        id="add-timer"
        title={t("window.addTitle")}
        onClose={() => setOpen("add-timer", false)}
        minHeight={300}
      >
        <AddTimerForm />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
