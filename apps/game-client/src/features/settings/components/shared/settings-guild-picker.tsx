import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  SettingsPickerCard,
  settingsPickerGridClassName,
} from "@/features/settings/components/shared/settings-picker-card";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import { Check } from "lucide-react";
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

/**
 * Multi-choice grid of server cards: avatar, name and a check mark on the
 * selected ones. Cards wrap to the available width, so the list never scrolls
 * sideways and every server is readable without a tooltip.
 */
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

type SettingsGuildPickerItemProps = {
  guild: Guild;
};

const SettingsGuildPickerItem: FC<SettingsGuildPickerItemProps> = ({
  guild,
}) => (
  <SettingsPickerCard
    value={guild.id}
    label={guild.name}
    leading={
      <Avatar
        aria-hidden
        className="ll:flex ll:size-8 ll:shrink-0 ll:rounded-sm ll:bg-black/25"
      >
        <AvatarImage
          src={guild.icon ?? undefined}
          alt=""
          className="ll:size-full ll:rounded-sm ll:object-cover"
        />
        <AvatarFallback className="ll:flex ll:size-full ll:items-center ll:justify-center ll:rounded-sm ll:bg-black/25 ll:text-xs ll:font-semibold ll:text-foreground">
          {guild.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    }
    title={guild.name}
    trailing={
      <span
        aria-hidden
        className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-primary ll:text-primary-foreground ll:scale-50 ll:opacity-0 ll:transition-[opacity,transform] ll:duration-200 ll:ease-[cubic-bezier(0.2,0,0,1)] ll:group-data-pressed/picker-card:scale-100 ll:group-data-pressed/picker-card:opacity-100"
      >
        <Check className="ll:size-3" />
      </span>
    }
  />
);

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
