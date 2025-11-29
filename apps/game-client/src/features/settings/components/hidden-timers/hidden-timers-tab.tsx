import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { useState } from "react";
import { useUserSettings } from "@/hooks/api/use-timers-settings";
import { GuildSwitcher } from "@/components/guild-switcher";

export const HiddenTimersTab = () => {
  const { generalConfig } = useUserSettings();
  const [selectedGuildId, setSelectedGuildId] = useState("");

  return (
    <div className="ll:flex ll:flex-col ll:gap-1 ll:pt-2">
      <label className="ll:mt-1 ll:font-semibold">
        {generalConfig.timersGrouping
          ? "Grupowanie włączone - globalne ustawienia bez podziału na serwer"
          : "Wybierz serwer:"}
      </label>
      {!generalConfig.timersGrouping && (
        <span className="ll:w-2/3">
          <GuildSwitcher
            className="ll:mb-2"
            onChange={setSelectedGuildId}
            value={selectedGuildId}
          />
        </span>
      )}
      <HiddenTimers guildId={selectedGuildId} />
    </div>
  );
};
