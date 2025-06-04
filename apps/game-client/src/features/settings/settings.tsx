import { DraggableWindow } from "@/components/draggable-window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalContext } from "@/contexts/global-context";
import { useGuilds } from "@/hooks/api/use-guilds";

export const Settings = () => {
  const {
    setSettingsWindowOpen,
    settingsWindowOpen,
    selectedGuild,
    setSelectedGuild,
  } = useGlobalContext();
  const { data: guilds } = useGuilds();

  return (
    settingsWindowOpen && (
      <DraggableWindow
        id="settings"
        title="Ustawienia"
        onClose={() => setSettingsWindowOpen(false)}
      >
        settings
      </DraggableWindow>
    )
  );
};
