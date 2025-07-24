import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { GuildSelector } from "@/components/guild-selector";
import { useState } from "react";
import { useTimersStore } from "@/store/timers.store";

export const HiddenTimersTab = () => {
  const { timersGrouping } = useTimersStore();
  const [selectedGuildId, setSelectedGuildId] = useState("");

  return (
    <div className="ll-flex ll-flex-col ll-gap-1 ll-pt-2">
      <label className="ll-mt-1 ll-font-semibold">
        {timersGrouping
          ? "Grupowanie włączone - globalne ustawienia bez podziału na serwer"
          : "Wybierz serwer:"}
      </label>
      {!timersGrouping && (
        <span className="ll-w-2/3">
          <GuildSelector
            className="ll-mb-2"
            onChange={setSelectedGuildId}
            value={selectedGuildId}
          />
        </span>
      )}
      <HiddenTimers guildId={selectedGuildId} />
    </div>
  );
};
