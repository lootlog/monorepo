import { DraggableWindow } from "@/components/draggable-window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalContext } from "@/contexts/global-context";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGuilds } from "@/hooks/api/use-guilds";

export const Settings = () => {
  const {
    setSettingsWindowOpen,
    settingsWindowOpen,
    selectedGuild,
    setSelectedGuild,
  } = useGlobalContext();
  const { data: guilds } = useGuilds();
  const { data: characterList } = useCharacterList();

  console.log("characterList", characterList);

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
