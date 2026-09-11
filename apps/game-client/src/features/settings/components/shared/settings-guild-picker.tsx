import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { TilePicker } from "@/components/tile-picker";
import { TilePickerItem } from "@/components/tile-picker-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import type { FC } from "react";

type SettingsGuildPickerProps = {
  guilds?: Guild[];
  selectedGuildIds: readonly string[];
  onToggle: (guildId: string) => void;
  emptyStateLabel: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

/** Multi-choice row of server avatars, styled like the character picker. */
export const SettingsGuildPicker: FC<SettingsGuildPickerProps> = ({
  guilds,
  selectedGuildIds,
  onToggle,
  emptyStateLabel,
  "aria-label": ariaLabel,
  className,
  disabled,
}) => {
  if (!guilds || guilds.length === 0) {
    return <SettingsEmptyState>{emptyStateLabel}</SettingsEmptyState>;
  }

  return (
    <TilePicker
      multiple
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={selectedGuildIds}
      onValueChange={(nextGuildIds) => {
        const toggledGuildId =
          nextGuildIds.find((id) => !selectedGuildIds.includes(id)) ??
          selectedGuildIds.find((id) => !nextGuildIds.includes(id));

        if (toggledGuildId) onToggle(toggledGuildId);
      }}
    >
      {guilds.map((guild) => (
        <TilePickerItem key={guild.id} value={guild.id} label={guild.name}>
          <Avatar
            aria-hidden
            className="ll:flex ll:size-8 ll:rounded-sm ll:bg-black/20"
          >
            <AvatarImage
              src={guild.icon ?? undefined}
              alt=""
              className="ll:size-full ll:object-cover"
            />
            <AvatarFallback className="ll:flex ll:size-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
              {guild.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </TilePickerItem>
      ))}
    </TilePicker>
  );
};

export const toggleAvailableGuild = (
  guilds: readonly Pick<Guild, "id">[],
  selectedGuildIds: readonly string[],
  guildId: string,
): string[] => {
  const nextGuildIds = selectedGuildIds.includes(guildId)
    ? selectedGuildIds.filter((id) => id !== guildId)
    : [...selectedGuildIds, guildId];

  const nextGuildIdSet = new Set(nextGuildIds);

  return guilds.flatMap((guild) =>
    nextGuildIdSet.has(guild.id) ? [guild.id] : [],
  );
};
