import { DraggableWindow } from "@/components/draggable-window";
import { useGlobalContext } from "@/contexts/global-context";

export const Settings = () => {
  const { setSettingsWindowOpen, settingsWindowOpen } = useGlobalContext();

  return (
    settingsWindowOpen && (
      <DraggableWindow
        id="settings"
        title="Settings"
        onClose={() => setSettingsWindowOpen(false)}
      >
        <div className="ll-p-2">Tutaj beda ustawienia xd</div>
      </DraggableWindow>
    )
  );
};
