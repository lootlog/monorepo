import type { FC } from "react";
import { GuildAvatar } from "@/components/guild-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GuildIdentity } from "@/lib/api/generated-helpers";

type GuildSelectProps = {
  guilds: readonly GuildIdentity[];
  value: string | undefined;
  onValueChange: (guildId: string) => void;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

/** Picks one Lootlog from a dropdown that shows each Lootlog's icon and name. */
export const GuildSelect: FC<GuildSelectProps> = ({
  guilds,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
  disabled,
  id,
}) => (
  <Select value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger
      id={id}
      size="sm"
      aria-label={ariaLabel}
      className={className}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {guilds.map((guild) => (
        <SelectItem key={guild.id} value={guild.id}>
          <GuildAvatar guild={guild} />
          <span className="ll:truncate">{guild.name}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
