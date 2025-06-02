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
        <div className="ll-pt-2">
          <label className="ll-text-white ll-text-[11px] ll-pl-1">
            Wybierz lootlog:
          </label>
          <Select value={selectedGuild} onValueChange={setSelectedGuild}>
            <SelectTrigger className="w-[180px] ll-text-white ll-text-xs ll-border-white ll-rounded-sm ll-h-4 ll-my-1">
              <SelectValue
                placeholder="Wybierz lootlog..."
                className="ll-h-4 ll-text-sm ll-text-white"
              />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => {
                return (
                  <SelectItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </DraggableWindow>
    )
  );
};
