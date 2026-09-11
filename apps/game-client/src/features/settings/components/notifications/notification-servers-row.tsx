import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type NotificationServersRowProps = {
  /** Category name; an NpcTypeChip. */
  title: ReactNode;
  /** Accessible name of the picker, e.g. "Serwery: Heros". */
  label: string;
  /** "3 z 10" style count shown under the name. */
  summary: string;
  guilds: Guild[] | undefined;
  selectedGuildIds: string[];
  disabled: boolean;
  emptyStateLabel: string;
  onToggle: (guildId: string) => void;
};

/**
 * One category of the servers section: the name on the left, the server
 * picker filling the rest of the row.
 */
export const NotificationServersRow: FC<NotificationServersRowProps> = ({
  title,
  label,
  summary,
  guilds,
  selectedGuildIds,
  disabled,
  emptyStateLabel,
  onToggle,
}) => (
  <div
    className={cn(
      "ll:flex ll:items-center ll:gap-2 ll:rounded-sm ll:px-2 ll:py-0.5 ll:transition-[background-color,opacity] ll:hover:bg-white/5",
      disabled && "ll:opacity-60",
    )}
  >
    <div className="ll:w-24 ll:shrink-0">
      <div className="ll:truncate ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground">
        {title}
      </div>
      <p className="ll:m-0 ll:text-[11px] ll:leading-[14px] ll:tabular-nums ll:text-muted-foreground">
        {summary}
      </p>
    </div>
    <div className="ll:min-w-0 ll:flex-1">
      <SettingsGuildPicker
        aria-label={label}
        guilds={guilds}
        selectedGuildIds={selectedGuildIds}
        disabled={disabled}
        onToggle={onToggle}
        emptyStateLabel={emptyStateLabel}
        className="ll:w-full"
      />
    </div>
  </div>
);
