import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
      className={cn(
        "ll:grid ll:w-full ll:grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] ll:gap-1.5",
        className,
      )}
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
  <ToggleGroupItem
    value={guild.id}
    aria-label={guild.name}
    title={guild.name}
    className={cn(
      "ll-custom-cursor-pointer ll:group/guild ll:h-auto ll:min-w-0 ll:justify-start ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-black/25 ll:p-1.5 ll:pr-2 ll:text-left ll:font-normal",
      "ll:transition-[background-color,box-shadow,opacity] ll:hover:bg-white/5",
      "ll:data-pressed:bg-primary/15 ll:data-pressed:hover:bg-primary/20 ll:data-pressed:shadow-[inset_0_0_0_1px_var(--color-primary)]",
      // Unselected servers are dimmed a little so the chosen ones read at a glance.
      "ll:not-disabled:not-data-pressed:opacity-70 ll:not-disabled:not-data-pressed:hover:opacity-100 ll:not-disabled:not-data-pressed:focus-visible:opacity-100",
      "ll:focus-visible:ring-0 ll:focus-visible:outline-2 ll:focus-visible:outline-offset-2 ll:focus-visible:outline-ring",
      "ll:disabled:opacity-60",
    )}
  >
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
    <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-foreground">
      {guild.name}
    </span>
    <span
      aria-hidden
      className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-primary ll:text-primary-foreground ll:opacity-0 ll:transition-opacity ll:group-data-pressed/guild:opacity-100"
    >
      <Check className="ll:size-3" />
    </span>
  </ToggleGroupItem>
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
