import { ToggleGroup } from "@/components/ui/toggle-group";
import { SettingsGuildPickerItem } from "@/features/settings/components/shared/settings-guild-picker-item";
import { settingsPickerGridClassName } from "@/features/settings/components/shared/settings-picker-card";
import { SettingsNoLootlogEmptyState } from "@/features/settings/components/shared/settings-no-lootlog-empty-state";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import type { FC } from "react";

type SettingsGuildPickerProps = {
  guilds?: Guild[];
  selectedGuildIds: readonly string[];
  onToggle: (guildId: string) => void;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Multi-choice grid of server cards: avatar, name and a check mark on the
 * selected ones. Cards wrap to the available width, so the list never scrolls
 * sideways and every server is readable without a tooltip. Without any
 * Lootlog it explains how to join one.
 */
export const SettingsGuildPicker: FC<SettingsGuildPickerProps> = ({
  guilds,
  selectedGuildIds,
  onToggle,
  "aria-label": ariaLabel,
  className,
  disabled,
}) => {
  if (!guilds || guilds.length === 0) {
    return <SettingsNoLootlogEmptyState />;
  }

  return (
    <ToggleGroup
      multiple
      aria-label={ariaLabel}
      disabled={disabled}
      value={selectedGuildIds}
      onValueChange={(nextGuildIds) => {
        const toggledGuildId =
          nextGuildIds.find((id) => !selectedGuildIds.includes(id)) ??
          selectedGuildIds.find((id) => !nextGuildIds.includes(id));

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
