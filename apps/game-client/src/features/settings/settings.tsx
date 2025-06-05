import { DraggableWindow } from "@/components/draggable-window";

import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useWindowsStore } from "@/store/windows.store";

export const Settings = () => {
  const {
    settings: { open },
    setOpen,
  } = useWindowsStore();
  const { data: characterList } = useCharacterList();

  return (
    open && (
      <DraggableWindow
        id="settings"
        title="Ustawienia"
        onClose={() => setOpen("settings", false)}
        variant="default"
      >
        <SettingsTabs />
      </DraggableWindow>
    )
  );
};
