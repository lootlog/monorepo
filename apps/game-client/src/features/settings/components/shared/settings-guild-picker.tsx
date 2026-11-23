import { ToggleGroup } from "@/components/ui/toggle-group";
import { SettingsGuildPickerItem } from "@/features/settings/components/shared/settings-guild-picker-item";
import { settingsPickerGridClassName } from "@/features/settings/components/shared/settings-picker-card";
import { NoLootlogEmptyState } from "@/components/no-lootlog-empty-state";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import { xor } from "es-toolkit";
import type { FC } from "react";

type SettingsGuildPickerProps = {
  guilds?: Guild[];
  selectedGuildIds: readonly string[];
  onToggle: (guildId: string) => void;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

export const SettingsGuildPicker: FC<SettingsGuildPickerProps> = ({
  guilds,
  selectedGuildIds,
  onToggle,
  "aria-label": ariaLabel,
  className,
  disabled,
}) => {
  if (!guilds || guilds.length === 0) {
    return <NoLootlogEmptyState />;
  }

  return (
    <ToggleGroup
      multiple
      aria-label={ariaLabel}
      disabled={disabled}
      value={selectedGuildIds}
      onValueChange={(nextGuildIds) => {
        const [toggledGuildId] = xor(nextGuildIds, selectedGuildIds);

        if (toggledGuildId) onToggle(toggledGuildId);
      }}
      className={cn(settingsPickerGridClassName, className)}
    >
      {guilds.map((guild) => (
        <SettingsGuildPickerItem key={guild.id} guild={guild} />
      ))}
    </ToggleGroup>
  );
};
